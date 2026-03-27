"""
Decision Recommendation Agent

Consumes DecisionOutput / MultiPondDecision (e.g., from XGBoostDecisionAgent)
and produces actionable, human-readable recommendations.

Design goals:
- Primary path uses an LLM (OpenAI) to generate concise action-plan text.
- Falls back to deterministic templates only if the LLM is unavailable/errors.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from models import WaterQualityData, FeedData, EnergyData, LaborData
from models.decision_outputs import ActionType, MultiPondDecision, DecisionOutput

# LangChain has moved OpenAI chat models across packages over time.
# Try the modern import first, then fall back for older LangChain versions.
try:
    from langchain_openai import ChatOpenAI  # type: ignore
    _OPENAI_AVAILABLE = True
except Exception:  # pragma: no cover
    try:
        from langchain.chat_models import ChatOpenAI  # type: ignore
        _OPENAI_AVAILABLE = True
    except Exception:  # pragma: no cover
        ChatOpenAI = None  # type: ignore[assignment]
        _OPENAI_AVAILABLE = False

try:
    from config import OPENAI_API_KEY, OPENAI_MODEL_NAME, OPENAI_TEMPERATURE
except Exception:  # pragma: no cover
    OPENAI_API_KEY = ""
    OPENAI_MODEL_NAME = "gpt-4o-mini"
    OPENAI_TEMPERATURE = 0.2


@dataclass(frozen=True)
class DecisionRecommendation:
    pond_id: int
    priority_rank: int
    urgency_score: float
    confidence: float
    primary_action: ActionType
    text: str


class DecisionRecommendationAgent:
    """
    Convert decision-agent outputs into operational recommendations.
    """

    def __init__(self, enable_llm: bool = True):
        self.enable_llm = bool(enable_llm)
        self.llm: Optional["ChatOpenAI"] = None

        if self.enable_llm and _OPENAI_AVAILABLE and OPENAI_API_KEY:
            try:
                self.llm = ChatOpenAI(
                    openai_api_key=OPENAI_API_KEY,
                    model_name=OPENAI_MODEL_NAME,
                    temperature=OPENAI_TEMPERATURE,
                )
            except Exception:
                self.llm = None

    def generate(
        self,
        decisions: MultiPondDecision,
        water_quality: List[WaterQualityData],
        feed: List[FeedData],
        energy: List[EnergyData],
        labor: List[LaborData],
        max_items: int = 10,
    ) -> List[DecisionRecommendation]:
        by_pond = decisions.recommended_actions
        rows: List[DecisionRecommendation] = []

        # Sort by priority (1 = most urgent)
        ordered = sorted(by_pond.values(), key=lambda d: (d.priority_rank, -d.urgency_score))
        for d in ordered[: max_items if max_items > 0 else len(ordered)]:
            wq = next((w for w in water_quality if w.pond_id == d.pond_id), None)
            f = next((x for x in feed if x.pond_id == d.pond_id), None)
            e = next((x for x in energy if x.pond_id == d.pond_id), None)
            l = next((x for x in labor if x.pond_id == d.pond_id), None)

            rows.append(
                DecisionRecommendation(
                    pond_id=d.pond_id,
                    priority_rank=d.priority_rank,
                    urgency_score=float(d.urgency_score),
                    confidence=float(d.confidence),
                    primary_action=d.primary_action,
                    text=self._recommendation_text(d, wq=wq, feed=f, energy=e, labor=l),
                )
            )
        return rows

    def _recommendation_text(
        self,
        d: DecisionOutput,
        wq: Optional[WaterQualityData],
        feed: Optional[FeedData],
        energy: Optional[EnergyData],
        labor: Optional[LaborData],
    ) -> str:
        # Prefer LLM-generated, dashboard-friendly text (single line, no markdown).
        llm_text = self._llm_recommendation_text(d, wq=wq, feed=feed, energy=energy, labor=labor)
        if llm_text:
            return llm_text

        # Fallback (only used if LLM is unavailable/errors).
        return self._fallback_recommendation_text(d, wq=wq, feed=feed, energy=energy, labor=labor)

    def _llm_recommendation_text(
        self,
        d: DecisionOutput,
        wq: Optional[WaterQualityData],
        feed: Optional[FeedData],
        energy: Optional[EnergyData],
        labor: Optional[LaborData],
    ) -> Optional[str]:
        if not self.enable_llm or not self.llm:
            return None

        # Keep it short and stable for UI list rendering.
        context_lines: List[str] = [
            f"Pond: {d.pond_id}",
            f"Model decision: primary_action={d.primary_action.value}, urgency={float(d.urgency_score):.2f}, confidence={float(d.confidence):.2f}, priority_rank={int(d.priority_rank)}",
        ]
        if wq is not None:
            context_lines.extend(
                [
                    f"Water: status={wq.status.value}, DO={wq.dissolved_oxygen:.2f} mg/L, NH3={wq.ammonia:.3f} mg/L, NO2={wq.nitrite:.3f} mg/L, pH={wq.ph:.2f}, temp={wq.temperature:.1f} C, salinity={wq.salinity:.1f} ppt, alerts={len(wq.alerts)}",
                ]
            )
        if feed is not None:
            context_lines.append(
                f"Feed: amount={feed.feed_amount:.1f} g, freq={feed.feeding_frequency}x/day, count={feed.shrimp_count}, avg_weight={feed.average_weight:.1f} g, type={feed.feed_type}"
            )
        if energy is not None:
            context_lines.append(
                f"Energy: aerator={energy.aerator_usage:.2f}, pump={energy.pump_usage:.2f}, heater={energy.heater_usage:.2f}, total={energy.total_energy:.2f}, eff={energy.efficiency_score:.2f}"
            )
        if labor is not None:
            context_lines.append(
                f"Labor: workers={labor.worker_count}, eff={labor.efficiency_score:.2f}, time_spent={labor.time_spent:.1f}h, pending_tasks={len(labor.next_tasks)}"
            )
        if getattr(d, "reasoning", ""):
            context_lines.append(f"Model reasoning: {str(d.reasoning).strip()}")

        prompt = (
            "You are an aquaculture operations manager. Based on the data below, write ONE concise action-plan line.\n"
            "Requirements:\n"
            "- Output plain text only (no markdown/bullets).\n"
            "- Start with an imperative verb (e.g., 'Increase', 'Reduce', 'Perform').\n"
            "- Mention 1-2 key measured triggers (like DO/NH3) when available.\n"
            "- Keep it <= 180 characters.\n\n"
            "Data:\n"
            + "\n".join(context_lines)
        )

        try:
            # Use invoke with a message list when possible (works across LangChain versions).
            try:
                from langchain_core.messages import HumanMessage  # type: ignore

                resp = self.llm.invoke([HumanMessage(content=prompt)])
            except Exception:
                try:
                    from langchain.schema import HumanMessage  # type: ignore

                    resp = self.llm.invoke([HumanMessage(content=prompt)])
                except Exception:
                    resp = self.llm.invoke(prompt)

            if hasattr(resp, "content"):
                text = str(resp.content).strip()
            else:
                text = str(resp).strip()

            # Normalize to a single line for the dashboard list.
            text = " ".join(text.split())
            if not text:
                return None
            # Avoid the model returning quotes.
            if (text.startswith('"') and text.endswith('"')) or (text.startswith("'") and text.endswith("'")):
                text = text[1:-1].strip()
            return text[:180]
        except Exception:
            return None

    @staticmethod
    def _fallback_recommendation_text(
        d: DecisionOutput,
        wq: Optional[WaterQualityData],
        feed: Optional[FeedData],
        energy: Optional[EnergyData],
        labor: Optional[LaborData],
    ) -> str:
        prefix = f"Pond {d.pond_id} (P{d.priority_rank}, urgency {d.urgency_score:.2f}, conf {d.confidence:.2f}): "

        if d.primary_action == ActionType.EMERGENCY_RESPONSE:
            parts = ["EMERGENCY response."]
            if wq and wq.dissolved_oxygen < 5.0:
                parts.append(f"Increase aeration immediately (DO={wq.dissolved_oxygen:.1f}).")
            if wq and wq.ammonia > 0.2:
                parts.append(f"Plan water exchange (NH3={wq.ammonia:.2f}).")
            parts.append("Re-test water in 30–60 minutes.")
            return prefix + " ".join(parts)

        if d.primary_action == ActionType.INCREASE_AERATION:
            if wq:
                return prefix + f"Increase aeration to raise dissolved oxygen (DO={wq.dissolved_oxygen:.1f} mg/L). Recheck in 1–2 hours."
            return prefix + "Increase aeration and monitor dissolved oxygen."

        if d.primary_action == ActionType.WATER_EXCHANGE:
            if wq:
                return prefix + f"Perform partial water exchange to reduce toxins (NH3={wq.ammonia:.2f}, NO2={wq.nitrite:.2f}). Recheck ammonia/nitrite."
            return prefix + "Perform partial water exchange and recheck ammonia/nitrite."

        if d.primary_action == ActionType.ADJUST_FEED:
            if wq and (wq.ammonia > 0.2 or wq.dissolved_oxygen < 5.0):
                return prefix + "Reduce feed 10–30% until water parameters stabilize (low DO / elevated ammonia)."
            if feed:
                return prefix + f"Adjust feeding schedule/amount based on conditions. Current feed per serving: {feed.feed_amount:.1f} g."
            return prefix + "Adjust feeding schedule/amount based on conditions."

        if d.primary_action == ActionType.ALLOCATE_WORKERS:
            if labor:
                return prefix + f"Allocate workers to priority tasks. Pending tasks: {len(labor.next_tasks)}; workers: {labor.worker_count}."
            return prefix + "Allocate workers to priority tasks."

        if d.primary_action == ActionType.MONITOR_CLOSELY:
            if wq:
                return prefix + f"Monitor closely (status={wq.status.value}). Re-test DO/ammonia and watch for trend changes."
            return prefix + "Monitor closely and re-test key parameters."

        return prefix + "No immediate action; continue routine monitoring."




