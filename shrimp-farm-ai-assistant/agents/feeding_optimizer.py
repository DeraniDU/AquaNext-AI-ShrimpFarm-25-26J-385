"""
Feeding Optimizer Agent

Provides two strategies:
- FeedingOptimizerAgent: AI agentic method using CrewAI + LLM to reason over
  water quality and biomass and produce per-pond feeding plans (with rule-based fallback).
- FeedingOptimizer: Rule-based method using fixed multipliers and industry-standard
  feed rates (3–5 % of biomass per day).

Both return FeedingPlan per pond with exact amounts and feeding windows.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, date
from typing import List, Optional, Any, Dict

from models import FeedData, WaterQualityData
from models.feeding_models import FeedingScheduleEntry, FeedingPlan, FeedingOptimizationResult

# CrewAI + LLM for agentic path
try:
    from crewai import Agent, Task, Crew
    CREWAI_AVAILABLE = True
except Exception:
    CREWAI_AVAILABLE = False

try:
    from langchain_openai import ChatOpenAI  # type: ignore
except Exception:
    try:
        from langchain.chat_models import ChatOpenAI  # type: ignore
    except Exception:
        ChatOpenAI = None  # type: ignore

try:
    from config import OPENAI_API_KEY, OPENAI_MODEL_NAME, OPENAI_TEMPERATURE
except Exception:
    OPENAI_API_KEY = ""
    OPENAI_MODEL_NAME = "gpt-4o-mini"
    OPENAI_TEMPERATURE = 0.2


# ---------------------------------------------------------------------------
# AI Agentic Feeding Optimizer (CrewAI + LLM)
# ---------------------------------------------------------------------------

class FeedingOptimizerAgent:
    """
    AI agentic feeding optimizer using a CrewAI agent and LLM to reason over
    water quality, biomass, and farming best practices and output structured
    per-pond feeding plans. Falls back to rule-based FeedingOptimizer when
    the LLM is unavailable or the agent task fails.
    """

    def __init__(self):
        self.llm = None
        self.agent = None
        if OPENAI_API_KEY and ChatOpenAI is not None:
            try:
                self.llm = ChatOpenAI(
                    openai_api_key=OPENAI_API_KEY,
                    model_name=OPENAI_MODEL_NAME,
                    temperature=OPENAI_TEMPERATURE,
                )
                self.agent = Agent(
                    role="Feed Optimization Specialist",
                    goal="Produce optimal daily feeding plans per pond to maximize growth and FCR while respecting water quality and shrimp biology.",
                    backstory="""You are an aquaculture nutritionist and farm operations expert with 15 years of experience in shrimp feed management.
                    You reason from water quality (pH, temperature, dissolved oxygen, ammonia), biomass estimates, and current feeding to recommend
                    daily feed amounts, feed types by shrimp size, and feeding times. You reduce feed when DO is low or ammonia is high, and align
                    feeding with typical shrimp activity peaks (e.g. morning and afternoon).""",
                    verbose=True,
                    allow_delegation=False,
                    llm=self.llm,
                )
            except Exception as e:
                print(f"[FeedingOptimizerAgent] LLM init failed: {e}")
                self.llm = None
                self.agent = None
        self._rule_based = FeedingOptimizer()

    def optimize_all(
        self,
        feed_data: List[FeedData],
        water_quality_data: List[WaterQualityData],
    ) -> FeedingOptimizationResult:
        if not self.agent or not CREWAI_AVAILABLE:
            return self._rule_based.optimize_all(feed_data, water_quality_data)
        try:
            task = self._create_optimization_task(feed_data, water_quality_data)
            crew = Crew(agents=[self.agent], tasks=[task], verbose=True)
            result = crew.kickoff()
            return self._parse_agent_result(result, feed_data, water_quality_data)
        except Exception as e:
            print(f"[FeedingOptimizerAgent] Agent run failed, using rule-based fallback: {e}")
            return self._rule_based.optimize_all(feed_data, water_quality_data)

    def _create_optimization_task(
        self,
        feed_data: List[FeedData],
        water_quality_data: List[WaterQualityData],
    ) -> Task:
        context = self._format_pond_context(feed_data, water_quality_data)
        return Task(
            description=f"""You are optimizing daily feeding for a shrimp farm. Use the data below to produce one feeding plan per pond.

{context}

Requirements:
1. For each pond, decide the total daily feed in kilograms (daily_feed_kg) based on biomass, water quality, and best practices. Reduce feed when dissolved oxygen is below 5 mg/L or ammonia is above 0.2 mg/L; reduce slightly when temperature is outside 26–30°C or pH outside 7.5–8.5.
2. Choose feed_type appropriate for average shrimp weight (e.g. "Starter Feed (45% protein)" for small, "Grower Feed (38% protein)" for medium, "Developer/Finisher Feed" for larger).
3. Give a short adjustment_reason in plain English explaining why you set that daily amount (e.g. water quality, biomass, risk).
4. Split the daily feed into 3 feeding times: morning (e.g. 07:00), midday (e.g. 13:00), afternoon (e.g. 17:00). Use typical activity peaks. Each schedule entry must have "time" (HH:MM), "amount_kg" (fraction of daily feed in kg), "notes" (short label).

You MUST respond with ONLY a single valid JSON object, no markdown or extra text, in this exact shape:
{{
  "plans": [
    {{
      "pond_id": 1,
      "daily_feed_kg": 0.025,
      "feed_type": "Developer Feed (35% protein, 2.0 mm pellet)",
      "adjustment_reason": "Optimal water quality; feeding at full 4% biomass rate.",
      "schedule": [
        {{ "time": "07:00", "amount_kg": 0.01, "notes": "Morning peak - high activity" }},
        {{ "time": "13:00", "amount_kg": 0.006, "notes": "Midday - moderate" }},
        {{ "time": "17:00", "amount_kg": 0.009, "notes": "Afternoon peak" }}
      ]
    }}
  ]
}}
Include one object in "plans" for each pond in the input data. Use the pond_ids from the data. Sum of amount_kg in schedule should equal daily_feed_kg for that pond.""",
            agent=self.agent,
            expected_output="Single JSON object with a 'plans' array; each plan has pond_id, daily_feed_kg, feed_type, adjustment_reason, and schedule (time, amount_kg, notes).",
        )

    def _format_pond_context(
        self,
        feed_data: List[FeedData],
        water_quality_data: List[WaterQualityData],
    ) -> str:
        lines = []
        for feed in feed_data:
            wq = next((w for w in water_quality_data if w.pond_id == feed.pond_id), None)
            biomass_kg = (feed.shrimp_count * feed.average_weight) / 1_000_000
            current_daily_kg = feed.feed_amount * (feed.feeding_frequency or 1) / 1000
            lines.append(f"Pond {feed.pond_id}:")
            lines.append(f"  Biomass (kg): {biomass_kg:.4f}  |  Shrimp: {feed.shrimp_count}, avg weight: {feed.average_weight}g")
            lines.append(f"  Current feeding: {feed.feed_amount}g x {feed.feeding_frequency} = {current_daily_kg:.3f} kg/day  |  Feed type: {feed.feed_type}")
            if wq:
                lines.append(
                    f"  Water: pH={wq.ph:.2f}, temp={wq.temperature:.1f}C, DO={wq.dissolved_oxygen:.2f} mg/L, "
                    f"ammonia={wq.ammonia:.3f}, salinity={wq.salinity:.1f}, status={wq.status.value}"
                )
            lines.append("")
        return "\n".join(lines)

    def _parse_agent_result(
        self,
        result: Any,
        feed_data: List[FeedData],
        water_quality_data: List[WaterQualityData],
    ) -> FeedingOptimizationResult:
        result_str = str(result)
        json_match = re.search(r"\{[\s\S]*\}", result_str)
        if not json_match:
            raise ValueError("No JSON object found in agent response")
        data = json.loads(json_match.group())
        plans_raw = data.get("plans") or []
        plans: List[FeedingPlan] = []
        for p in plans_raw:
            pond_id = int(p.get("pond_id", 0))
            feed = next((f for f in feed_data if f.pond_id == pond_id), None)
            if not feed:
                continue
            biomass_kg = max((feed.shrimp_count * feed.average_weight) / 1_000_000, 0.001)
            current_daily_feed_kg = feed.feed_amount * (feed.feeding_frequency or 1) / 1000
            daily_feed_kg = float(p.get("daily_feed_kg", 0.04 * biomass_kg))
            daily_feed_kg = max(0.001, min(daily_feed_kg, biomass_kg * 0.15))
            feed_type = str(p.get("feed_type") or feed.feed_type)
            adjustment_reason = str(p.get("adjustment_reason") or "AI-recommended adjustment.")
            schedule_raw = p.get("schedule") or []
            schedule: List[FeedingScheduleEntry] = []
            for s in schedule_raw[:5]:
                time_str = str(s.get("time", "07:00"))[:5]
                amt_kg = float(s.get("amount_kg", 0))
                amt_g = round(amt_kg * 1000, 1)
                notes = str(s.get("notes") or "")
                schedule.append(FeedingScheduleEntry(time=time_str, amount_kg=amt_kg, amount_g=amt_g, notes=notes))
            if not schedule:
                schedule = [
                    FeedingScheduleEntry(time="07:00", amount_kg=daily_feed_kg * 0.4, amount_g=daily_feed_kg * 400, notes="Morning"),
                    FeedingScheduleEntry(time="13:00", amount_kg=daily_feed_kg * 0.25, amount_g=daily_feed_kg * 250, notes="Midday"),
                    FeedingScheduleEntry(time="17:00", amount_kg=daily_feed_kg * 0.35, amount_g=daily_feed_kg * 350, notes="Afternoon"),
                ]
            current_fcr = round(current_daily_feed_kg / biomass_kg, 3) if biomass_kg > 0 else 1.2
            fcr_target = round(daily_feed_kg / biomass_kg, 3) if biomass_kg > 0 else 1.2
            base_rate = 0.04 * biomass_kg
            adjustment_factor = round(max(0.5, min(1.2, daily_feed_kg / base_rate)) if base_rate > 0 else 1.0, 3)
            plans.append(
                FeedingPlan(
                    pond_id=pond_id,
                    daily_feed_kg=round(daily_feed_kg, 3),
                    current_daily_feed_kg=round(current_daily_feed_kg, 3),
                    current_biomass_kg=round(biomass_kg, 4),
                    feed_type=feed_type,
                    fcr_current=current_fcr,
                    fcr_target=fcr_target,
                    schedule=schedule,
                    adjustment_factor=adjustment_factor,
                    adjustment_reason=adjustment_reason,
                )
            )
        if not plans:
            return self._rule_based.optimize_all(feed_data, water_quality_data)
        total_feed_kg = sum(p.daily_feed_kg for p in plans)
        total_biomass_kg = sum(p.current_biomass_kg for p in plans)
        overall_fcr = round(total_feed_kg / total_biomass_kg, 3) if total_biomass_kg > 0 else 1.2
        current_feed_kg = sum(
            f.feed_amount * (f.feeding_frequency or 1) / 1000 for f in feed_data
        )
        savings_pct = round((current_feed_kg - total_feed_kg) / current_feed_kg * 100, 1) if current_feed_kg > 0 else 0.0
        top_plan = min(plans, key=lambda x: x.adjustment_factor)
        top_recommendation = f"Pond {top_plan.pond_id}: {top_plan.adjustment_reason}"
        return FeedingOptimizationResult(
            timestamp=datetime.utcnow(),
            plans=plans,
            overall_fcr=overall_fcr,
            potential_savings_pct=savings_pct,
            top_recommendation=top_recommendation,
        )


# ---------------------------------------------------------------------------
# Rule-based Feeding Optimizer (fallback / no-LLM)
# ---------------------------------------------------------------------------

class FeedingOptimizer:
    """
    Rule-based feeding optimizer.

    Adjustment multipliers are grounded in shrimp aquaculture literature:
    - Temperature below optimal slows metabolism → reduce feed.
    - Low dissolved oxygen → shrimp stop eating → reduce feed significantly.
    - High ammonia → waste toxicity; extra feed worsens it → reduce sharply.
    - Off-range pH → reduced gut enzyme activity → slight reduction.

    The daily feed rate target is 4 % of total biomass, which sits in the
    middle of the industry-recommended 3–5 % range for grow-out phases.
    """

    # Base feed rate as % of biomass per day (grow-out phase)
    BASE_FEED_RATE = 0.04

    # Optimal water quality windows
    OPTIMAL_TEMP_LOW = 26.0
    OPTIMAL_TEMP_HIGH = 30.0
    OPTIMAL_DO = 5.0        # mg/L minimum
    OPTIMAL_AMMONIA = 0.2   # mg/L maximum
    OPTIMAL_PH_LOW = 7.5
    OPTIMAL_PH_HIGH = 8.5

    # Daily feeding windows by priority (start hour, label, fraction of daily feed)
    FEEDING_WINDOWS = [
        (7,  "Morning peak — high shrimp activity",     0.40),
        (13, "Midday — moderate activity",              0.25),
        (17, "Afternoon peak — second activity spike",  0.35),
    ]

    def optimize_all(
        self,
        feed_data: List[FeedData],
        water_quality_data: List[WaterQualityData],
    ) -> FeedingOptimizationResult:
        plans: List[FeedingPlan] = []

        for feed in feed_data:
            wq = next(
                (w for w in water_quality_data if w.pond_id == feed.pond_id),
                None,
            )
            plan = self.optimize(feed, wq)
            plans.append(plan)

        # Overall FCR across all ponds
        total_feed_kg = sum(p.daily_feed_kg for p in plans)
        total_biomass_kg = sum(p.current_biomass_kg for p in plans)
        overall_fcr = (
            round(total_feed_kg / total_biomass_kg, 3)
            if total_biomass_kg > 0
            else 1.2
        )

        # Potential savings vs current feeding
        current_feed_kg = sum(
            f.feed_amount * (f.feeding_frequency if f.feeding_frequency > 0 else 1) / 1000
            for f in feed_data
        )
        savings_pct = (
            round((current_feed_kg - total_feed_kg) / current_feed_kg * 100, 1)
            if current_feed_kg > 0
            else 0.0
        )

        # Pick the most urgent single recommendation
        top_plan = min(plans, key=lambda p: p.adjustment_factor)
        top_recommendation = (
            f"Pond {top_plan.pond_id}: {top_plan.adjustment_reason}"
            if plans
            else "All ponds are within optimal feeding parameters."
        )

        return FeedingOptimizationResult(
            timestamp=datetime.utcnow(),
            plans=plans,
            overall_fcr=overall_fcr,
            potential_savings_pct=savings_pct,
            top_recommendation=top_recommendation,
        )

    def optimize(
        self,
        feed: FeedData,
        wq: Optional[WaterQualityData],
    ) -> FeedingPlan:
        # Biomass in kg (shrimp_count × avg weight in grams → kg)
        biomass_kg = (feed.shrimp_count * feed.average_weight) / 1_000_000
        # Guard: minimum 1 g biomass so we don't divide by zero
        biomass_kg = max(biomass_kg, 0.001)

        # Calculate water-quality-based adjustment
        temp_factor = self._temp_adjustment(wq.temperature if wq else 28.0)
        do_factor = self._do_adjustment(wq.dissolved_oxygen if wq else 6.5)
        ammonia_factor = self._ammonia_adjustment(wq.ammonia if wq else 0.1)
        ph_factor = self._ph_adjustment(wq.ph if wq else 7.8)

        combined = temp_factor * do_factor * ammonia_factor * ph_factor
        # Clamp between 50 % and 120 %
        combined = max(0.5, min(1.2, combined))

        daily_feed_kg = round(biomass_kg * self.BASE_FEED_RATE * combined, 3)
        # When we have real biomass, never return 0 so UI can show a DB-based recommendation
        if biomass_kg >= 0.001 and daily_feed_kg <= 0:
            daily_feed_kg = 0.001

        # Build feeding schedule entries
        today = date.today()
        schedule: List[FeedingScheduleEntry] = []
        for hour, note, fraction in self.FEEDING_WINDOWS:
            amount_kg = round(daily_feed_kg * fraction, 3)
            schedule.append(
                FeedingScheduleEntry(
                    time=f"{hour:02d}:00",
                    amount_kg=amount_kg,
                    amount_g=round(amount_kg * 1000, 1),
                    notes=note,
                )
            )

        # Current FCR for this pond
        current_daily_feed_kg = (
            feed.feed_amount
            * (feed.feeding_frequency if feed.feeding_frequency > 0 else 1)
            / 1000
        )
        current_fcr = (
            round(current_daily_feed_kg / biomass_kg, 3) if biomass_kg > 0 else 1.2
        )
        # Target FCR after optimization (adjustment moves us toward optimal)
        target_fcr = round(current_fcr * combined, 3)

        feed_type = self._select_feed_type(feed.average_weight)
        reason = self._build_reason(temp_factor, do_factor, ammonia_factor, ph_factor, wq)

        return FeedingPlan(
            pond_id=feed.pond_id,
            daily_feed_kg=daily_feed_kg,
            current_daily_feed_kg=round(current_daily_feed_kg, 3),
            current_biomass_kg=round(biomass_kg, 4),
            feed_type=feed_type,
            fcr_current=current_fcr,
            fcr_target=target_fcr,
            schedule=schedule,
            adjustment_factor=round(combined, 3),
            adjustment_reason=reason,
        )

    # ------------------------------------------------------------------ #
    # Adjustment helpers                                                   #
    # ------------------------------------------------------------------ #

    def _temp_adjustment(self, temp: float) -> float:
        if temp < 24:
            return 0.70   # Very cold — metabolism much slower
        if temp < self.OPTIMAL_TEMP_LOW:
            return 0.85   # Below optimal
        if temp > 32:
            return 0.80   # Too hot — heat stress
        if temp > self.OPTIMAL_TEMP_HIGH:
            return 0.90   # Slightly above optimal
        return 1.0        # Optimal range

    def _do_adjustment(self, do: float) -> float:
        if do < 3.0:
            return 0.50   # Severe hypoxia — stop most feeding
        if do < self.OPTIMAL_DO:
            return 0.70   # Low oxygen — reduce feeding significantly
        return 1.0

    def _ammonia_adjustment(self, ammonia: float) -> float:
        if ammonia > 0.5:
            return 0.50   # Severely toxic — cut feed drastically
        if ammonia > self.OPTIMAL_AMMONIA:
            return 0.65   # Elevated — significant reduction
        return 1.0

    def _ph_adjustment(self, ph: float) -> float:
        if ph < 7.0 or ph > 9.0:
            return 0.80   # Far outside range — digestibility impaired
        if ph < self.OPTIMAL_PH_LOW or ph > self.OPTIMAL_PH_HIGH:
            return 0.90   # Slightly outside optimal
        return 1.0

    @staticmethod
    def _select_feed_type(avg_weight_g: float) -> str:
        if avg_weight_g < 2:
            return "Larval Feed (50% protein, 0.2 mm pellet)"
        if avg_weight_g < 5:
            return "Starter Feed (45% protein, 0.5 mm pellet)"
        if avg_weight_g < 10:
            return "Grower Feed (38% protein, 1.5 mm pellet)"
        if avg_weight_g < 18:
            return "Developer Feed (35% protein, 2.0 mm pellet)"
        return "Finisher Feed (30% protein, 2.5 mm pellet)"

    @staticmethod
    def _build_reason(
        temp_f: float,
        do_f: float,
        ammonia_f: float,
        ph_f: float,
        wq: Optional[WaterQualityData],
    ) -> str:
        issues: List[str] = []

        if do_f < 0.9 and wq:
            issues.append(f"Low DO ({wq.dissolved_oxygen:.1f} mg/L → reduce feed to prevent waste accumulation)")
        if ammonia_f < 0.9 and wq:
            issues.append(f"Elevated ammonia ({wq.ammonia:.2f} mg/L → reduce feed to limit nitrogen load)")
        if temp_f < 0.9 and wq:
            issues.append(f"Sub-optimal temperature ({wq.temperature:.1f}°C → reduce feed rate)")
        if ph_f < 0.9 and wq:
            issues.append(f"pH out of range ({wq.ph:.2f} → slight reduction for digestibility)")

        if not issues:
            return "All water parameters are within optimal range — feeding at full recommended rate."
        return "; ".join(issues) + "."
