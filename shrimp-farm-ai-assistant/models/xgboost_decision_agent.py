"""
XGBoost-based Decision Agent

Goal: keep a *simple* ML-based decision agent with the same public API used by
`ManagerAgent`:
  - make_decision(...)
  - make_multi_pond_decisions(...)

Compared to AutoGluon:
- fewer moving parts (2 models vs 4 predictors)
- no pandas dependency in the runtime path
- fast training/inference and easy deployment
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import json

import numpy as np

from models import WaterQualityData, FeedData, EnergyData, LaborData
from models.decision_model import FeatureExtractor
from models.decision_outputs import ActionType, DecisionOutput, MultiPondDecision

try:
    import joblib
    import xgboost as xgb

    XGBOOST_AVAILABLE = True
except Exception:  # pragma: no cover
    XGBOOST_AVAILABLE = False

# OpenAI integration for enhanced explanations
try:
    from langchain_openai import ChatOpenAI  # type: ignore
    OPENAI_AVAILABLE = True
except Exception:  # pragma: no cover
    try:
        from langchain.chat_models import ChatOpenAI  # type: ignore
        OPENAI_AVAILABLE = True
    except Exception:  # pragma: no cover
        OPENAI_AVAILABLE = False

try:
    from config import OPENAI_API_KEY, OPENAI_MODEL_NAME, OPENAI_TEMPERATURE
except Exception:  # pragma: no cover
    OPENAI_API_KEY = None
    OPENAI_MODEL_NAME = "gpt-4o-mini"
    OPENAI_TEMPERATURE = 0.2


class XGBoostDecisionAgent:
    """
    Minimal ML decision agent powered by XGBoost.

    Models:
    - action_model: XGBClassifier predicting integer action_type in [0..7]
    - urgency_model: XGBRegressor predicting urgency in [0..1]

    Note: training may encode observed classes to 0..K-1 and store a mapping
    in `action_class_mapping.json`. At runtime we map back to the original
    0..7 ActionType IDs.
    """

    def __init__(self, model_dir: str = "models/xgboost_models", enable_llm_explanations: bool = True):
        if not XGBOOST_AVAILABLE:
            raise ImportError("XGBoost dependencies not installed. Install with: pip install xgboost joblib")

        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)

        self.feature_extractor = FeatureExtractor()
        self.action_model: Optional["xgb.XGBClassifier"] = None
        self.urgency_model: Optional["xgb.XGBRegressor"] = None
        self._enc_to_orig: Optional[Dict[int, int]] = None

        # OpenAI LLM for enhanced explanations (optional)
        self.llm: Optional[ChatOpenAI] = None
        self.enable_llm_explanations = enable_llm_explanations and OPENAI_AVAILABLE
        if self.enable_llm_explanations and OPENAI_API_KEY:
            try:
                self.llm = ChatOpenAI(
                    openai_api_key=OPENAI_API_KEY,
                    model_name=OPENAI_MODEL_NAME,
                    temperature=OPENAI_TEMPERATURE,
                )
            except Exception:
                self.enable_llm_explanations = False
                self.llm = None

        # For compatibility with code that checks this flag.
        self.is_trained = False
        self._try_load_models()

    def _try_load_models(self) -> None:
        action_path = self.model_dir / "action_model.pkl"
        urgency_path = self.model_dir / "urgency_model.pkl"
        mapping_path = self.model_dir / "action_class_mapping.json"

        if action_path.exists() and urgency_path.exists():
            self.action_model = joblib.load(action_path)
            self.urgency_model = joblib.load(urgency_path)

            if mapping_path.exists():
                try:
                    payload = json.loads(mapping_path.read_text(encoding="utf-8"))
                    enc_to_orig = payload.get("enc_to_orig") or {}
                    # JSON keys may be strings; normalize to int->int.
                    self._enc_to_orig = {int(k): int(v) for k, v in enc_to_orig.items()}
                except Exception:
                    self._enc_to_orig = None

            self.is_trained = True

    def make_decision(  
        self,
        water_quality_data: List[WaterQualityData],
        feed_data: List[FeedData],
        energy_data: List[EnergyData],
        labor_data: List[LaborData],
        pond_id: Optional[int] = None,
    ) -> DecisionOutput:
        if not self.is_trained or self.action_model is None or self.urgency_model is None:
            raise ValueError("XGBoost models not trained/loaded. Train with: python train_xgboost_models.py")

        if not water_quality_data or not feed_data or not energy_data or not labor_data:
            raise ValueError("All data lists must be non-empty")

        if pond_id is None:
            pond_id = water_quality_data[0].pond_id

        wq = next((w for w in water_quality_data if w.pond_id == pond_id), water_quality_data[0])
        feed = next((f for f in feed_data if f.pond_id == pond_id), feed_data[0])
        energy = next((e for e in energy_data if e.pond_id == pond_id), energy_data[0])
        labor = next((l for l in labor_data if l.pond_id == pond_id), labor_data[0])

        # FeatureExtractor returns a 35-float vector for a single pond.
        x = self.feature_extractor.extract_features([wq], [feed], [energy], [labor])
        x = np.asarray(x, dtype=np.float32).reshape(1, -1)

        action_pred = int(self.action_model.predict(x)[0])
        action_idx = int(self._enc_to_orig.get(action_pred, action_pred) if self._enc_to_orig else action_pred)
        action_idx = max(0, min(7, action_idx))

        urgency = float(self.urgency_model.predict(x)[0])
        urgency = float(max(0.0, min(1.0, urgency)))

        confidence = self._confidence(x, urgency)
        primary_action = self._map_action(action_idx)

        # Generate enhanced reasoning with OpenAI if available
        reasoning = self._generate_reasoning(
            primary_action=primary_action,
            urgency=urgency,
            confidence=confidence,
            wq=wq,
            feed=feed,
            energy=energy,
            labor=labor,
        )

        return DecisionOutput(
            timestamp=datetime.now(),
            pond_id=int(pond_id),
            primary_action=primary_action,
            action_intensity=urgency,
            secondary_actions=[],
            priority_rank=1,  # overwritten in multi-pond pass
            urgency_score=urgency,
            # Keep optional optimization outputs unset for maximum simplicity.
            recommended_feed_amount=None,
            recommended_aerator_level=None,
            recommended_pump_level=None,
            recommended_heater_level=None,
            confidence=confidence,
            reasoning=reasoning,
            affected_factors=self._affected_factors(wq, energy, labor), 
        )

    def make_multi_pond_decisions(
        self,
        water_quality_data: List[WaterQualityData],
        feed_data: List[FeedData],
        energy_data: List[EnergyData],
        labor_data: List[LaborData],
    ) -> MultiPondDecision:
        decisions: Dict[int, DecisionOutput] = {}

        pond_ids = [wq.pond_id for wq in water_quality_data]
        for pid in pond_ids:
            decisions[pid] = self.make_decision(
                water_quality_data=water_quality_data,
                feed_data=feed_data,
                energy_data=energy_data,
                labor_data=labor_data,
                pond_id=pid,
            )

        # Assign priority ranks: 1 = most urgent
        urgency_sorted = sorted(decisions.items(), key=lambda kv: kv[1].urgency_score, reverse=True)
        pond_priorities: Dict[int, int] = {}
        for rank, (pid, decision) in enumerate(urgency_sorted, start=1):
            # Be robust across pydantic v1/v2: avoid relying on in-place mutation.
            try:
                decisions[pid] = decision.model_copy(update={"priority_rank": rank})  # pydantic v2
            except Exception:
                try:
                    decisions[pid] = decision.copy(update={"priority_rank": rank})  # pydantic v1
                except Exception:
                    decision.priority_rank = rank  # last resort
                    decisions[pid] = decision
            pond_priorities[pid] = rank

        urgent_ponds = [pid for pid, d in decisions.items() if d.urgency_score >= 0.7]
        overall_urgency = max((d.urgency_score for d in decisions.values()), default=0.0)

        total_urgency = sum(d.urgency_score for d in decisions.values())
        resource_allocation: Dict[str, float] = {}
        if total_urgency > 0:
            for pid, d in decisions.items():
                resource_allocation[f"pond_{pid}"] = d.urgency_score / total_urgency

        return MultiPondDecision(
            timestamp=datetime.now(),
            pond_priorities=pond_priorities,
            urgent_ponds=urgent_ponds,
            recommended_actions=decisions,
            overall_urgency=overall_urgency,
            resource_allocation=resource_allocation,
        )

    def _confidence(self, x: np.ndarray, urgency: float) -> float:
        try:
            proba = self.action_model.predict_proba(x)  # type: ignore[union-attr]
            return float(np.max(proba))
        except Exception:
            # Fallback: scale modestly with urgency (mirrors rule-based agents).
            return float(max(0.6, min(0.85, 0.6 + urgency * 0.25)))

    @staticmethod
    def _map_action(action_idx: int) -> ActionType:
        action_type_map = {
            0: ActionType.NO_ACTION,
            1: ActionType.INCREASE_AERATION,
            2: ActionType.DECREASE_AERATION,
            3: ActionType.WATER_EXCHANGE,
            4: ActionType.ADJUST_FEED,
            5: ActionType.EMERGENCY_RESPONSE,
            6: ActionType.ALLOCATE_WORKERS,
            7: ActionType.MONITOR_CLOSELY,
        }
        return action_type_map.get(int(action_idx), ActionType.NO_ACTION)

    def _generate_reasoning(
        self,
        primary_action: ActionType,
        urgency: float,
        confidence: float,
        wq: WaterQualityData,
        feed: FeedData,
        energy: EnergyData,
        labor: LaborData,
    ) -> str:
        """
        Generate detailed reasoning explanation for the decision.
        Uses OpenAI LLM if available, otherwise falls back to template-based explanation.
        """
        # Fallback to simple explanation if LLM is not available
        if not self.enable_llm_explanations or not self.llm:
            return self._generate_fallback_reasoning(
                primary_action, urgency, confidence, wq, feed, energy, labor
            )

        try:
            # Build context for LLM
            context = self._build_decision_context(wq, feed, energy, labor)
            
            prompt = f"""You are an expert aquaculture specialist analyzing shrimp farm operations. 
Based on the following data, provide a clear, actionable explanation for why the AI system recommended 
the action "{primary_action.value}" with urgency {urgency:.2f} and confidence {confidence:.2f}.

Context:
{context}

Provide a concise but comprehensive explanation (2-3 sentences) that:
1. Explains the key factors that led to this decision
2. Describes why this action is appropriate given the current conditions
3. Mentions any specific parameters that triggered the recommendation

Be professional, clear, and actionable. Focus on the most critical issues."""

            # Use invoke with a simple string message (compatible with both old and new langchain)
            try:
                # Try new langchain API first
                from langchain_core.messages import HumanMessage  # type: ignore
                response = self.llm.invoke([HumanMessage(content=prompt)])
            except Exception:
                # Fallback to older API
                try:
                    from langchain.schema import HumanMessage  # type: ignore
                    response = self.llm.invoke([HumanMessage(content=prompt)])
                except Exception:
                    # Direct call as last resort
                    response = self.llm.invoke(prompt)
            
            # Extract content from response
            if hasattr(response, 'content'):
                explanation = response.content.strip()
            elif isinstance(response, str):
                explanation = response.strip()
            else:
                explanation = str(response).strip()
            
            # Ensure we have a valid explanation
            if explanation and len(explanation) > 20:
                return explanation
            else:
                return self._generate_fallback_reasoning(
                    primary_action, urgency, confidence, wq, feed, energy, labor
                )
        except Exception as e:
            # Fallback on any error
            return self._generate_fallback_reasoning(
                primary_action, urgency, confidence, wq, feed, energy, labor
            )

    def _build_decision_context(
        self,
        wq: WaterQualityData,
        feed: FeedData,
        energy: EnergyData,
        labor: LaborData,
    ) -> str:
        """Build a structured context string for LLM reasoning."""
        context_parts = [
            f"Water Quality Status: {wq.status.value}",
            f"Dissolved Oxygen: {wq.dissolved_oxygen:.2f} mg/L (optimal: >5.0)",
            f"Ammonia: {wq.ammonia:.3f} mg/L (optimal: <0.2)",
            f"Nitrite: {wq.nitrite:.3f} mg/L",
            f"pH: {wq.ph:.2f} (optimal: 7.5-8.5)",
            f"Temperature: {wq.temperature:.1f}°C (optimal: 26-30°C)",
            f"Salinity: {wq.salinity:.1f} ppt (optimal: 15-25)",
        ]
        
        if feed:
            context_parts.append(
                f"Feed: {feed.feed_amount:.1f}g per serving, "
                f"Average weight: {feed.average_weight:.1f}g, "
                f"Shrimp count: {feed.shrimp_count}"
            )
        
        if energy:
            context_parts.append(
                f"Energy Efficiency: {energy.efficiency_score:.2f}, "
                f"Aerator usage: {energy.aerator_usage:.1%}, "
                f"Pump usage: {energy.pump_usage:.1%}"
            )
        
        if labor:
            context_parts.append(
                f"Labor Efficiency: {labor.efficiency_score:.2f}, "
                f"Workers: {labor.worker_count}, "
                f"Pending tasks: {len(labor.next_tasks)}"
            )
        
        return "\n".join(context_parts)

    @staticmethod
    def _generate_fallback_reasoning(
        primary_action: ActionType,
        urgency: float,
        confidence: float,
        wq: WaterQualityData,
        feed: FeedData,
        energy: EnergyData,
        labor: LaborData,
    ) -> str:
        """Generate a template-based reasoning when LLM is not available."""
        base_reasoning = f"XGBoost model recommended {primary_action.value} with urgency {urgency:.2f} and confidence {confidence:.2f}."
        
        # Add context-specific details
        details = []
        
        if primary_action == ActionType.EMERGENCY_RESPONSE:
            if wq.dissolved_oxygen < 5.0:
                details.append(f"Critical: Dissolved oxygen is dangerously low at {wq.dissolved_oxygen:.2f} mg/L.")
            if wq.ammonia > 0.2:
                details.append(f"Critical: Ammonia levels are elevated at {wq.ammonia:.3f} mg/L.")
            details.append("Immediate intervention required to prevent shrimp mortality.")
        
        elif primary_action == ActionType.INCREASE_AERATION:
            details.append(f"Dissolved oxygen is {wq.dissolved_oxygen:.2f} mg/L, below optimal levels (>5.0 mg/L).")
            details.append("Increasing aeration will improve oxygen saturation and shrimp health.")
        
        elif primary_action == ActionType.WATER_EXCHANGE:
            if wq.ammonia > 0.2:
                details.append(f"Ammonia levels at {wq.ammonia:.3f} mg/L exceed safe thresholds.")
            if wq.nitrite > 0.1:
                details.append(f"Nitrite levels at {wq.nitrite:.3f} mg/L are elevated.")
            details.append("Partial water exchange will dilute toxins and improve water quality.")
        
        elif primary_action == ActionType.ADJUST_FEED:
            if wq.dissolved_oxygen < 5.0 or wq.ammonia > 0.2:
                details.append("Water quality stress detected. Reducing feed will decrease metabolic load.")
            else:
                details.append(f"Current feed: {feed.feed_amount:.1f}g. Adjusting based on growth stage and conditions.")
        
        elif primary_action == ActionType.ALLOCATE_WORKERS:
            details.append(f"Labor efficiency at {labor.efficiency_score:.2f} with {len(labor.next_tasks)} pending tasks.")
            details.append("Reallocating workers to prioritize critical operations.")
        
        elif primary_action == ActionType.MONITOR_CLOSELY:
            details.append(f"Water quality status: {wq.status.value}. Conditions require close monitoring.")
            details.append("No immediate action needed, but parameters should be tracked for trends.")
        
        if details:
            return base_reasoning + " " + " ".join(details)
        return base_reasoning

    @staticmethod
    def _affected_factors(wq: WaterQualityData, energy: EnergyData, labor: LaborData) -> List[str]:
        factors: List[str] = []
        if wq.status.value in ["poor", "critical"]:
            factors.append("Water Quality")
        if wq.dissolved_oxygen < 5.0:
            factors.append("Dissolved Oxygen")
        if wq.ammonia > 0.2:
            factors.append("Ammonia Levels")
        if energy.efficiency_score < 0.7:
            factors.append("Energy Efficiency")
        if labor.efficiency_score < 0.7:
            factors.append("Labor Efficiency")
        return factors if factors else ["Normal Operations"]


