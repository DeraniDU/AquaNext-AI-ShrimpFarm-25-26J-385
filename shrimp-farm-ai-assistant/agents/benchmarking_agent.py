"""
Benchmarking Agent: compares farm performance against targets and best practices.
Uses CrewAI + LLM when OPENAI_API_KEY is set. No rule-based scoring or fallbacks.
"""

import re
from crewai import Agent, Task, Crew
from typing import List, Dict, Any, Optional
from datetime import datetime

try:
    from langchain_openai import ChatOpenAI  # type: ignore
except Exception:
    from langchain.chat_models import ChatOpenAI  # type: ignore

from models import (
    WaterQualityData,
    FeedData,
    EnergyData,
    LaborData,
    ShrimpFarmDashboard,
)
from config import OPENAI_API_KEY, OPENAI_MODEL_NAME, OPENAI_TEMPERATURE


# Target ranges for comparison display (current vs target)
BENCHMARK_TARGETS = {
    "ph_range": (7.5, 8.5),
    "temperature_range": (26, 30),
    "dissolved_oxygen_min": 2.2,
    "salinity_range": (15, 25),
    "ammonia_max": 0.2,
}


class BenchmarkingAgent:
    """
    AI agent that benchmarks current farm performance against targets and
    industry best practices, producing scores and actionable insights.
    """

    def __init__(self):
        self.llm = None
        self.agent = None

        if OPENAI_API_KEY:
            self.llm = ChatOpenAI(
                openai_api_key=OPENAI_API_KEY,
                model_name=OPENAI_MODEL_NAME,
                temperature=OPENAI_TEMPERATURE,
            )
            self.agent = Agent(
                role="Shrimp Farm Benchmarking Specialist",
                goal="Compare farm performance against targets and best practices to identify strengths, gaps, and prioritized recommendations",
                backstory="""You are an aquaculture performance analyst with 10+ years of experience benchmarking shrimp farms.
                You understand optimal water quality ranges, feed conversion ratios, energy efficiency, and labor productivity.
                You provide clear, actionable benchmark reports: current KPIs vs targets, trend direction, and prioritized next steps.""",
                verbose=True,
                allow_delegation=False,
                llm=self.llm,
            )

    def run_benchmark(
        self,
        dashboard: ShrimpFarmDashboard,
        water_quality_data: List[WaterQualityData],
        feed_data: List[FeedData],
        energy_data: List[EnergyData],
        labor_data: List[LaborData],
        historical_snapshots: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Run benchmark using AI only. Builds comparisons (current vs target) from data;
        scores and recommendations come from the LLM when OPENAI_API_KEY is set.
        """
        historical_snapshots = historical_snapshots or []
        comparisons = self._build_comparisons(
            water_quality_data, feed_data, energy_data, labor_data
        )

        default_scores = {
            "water_quality": 0.0,
            "feed": 0.0,
            "energy": 0.0,
            "labor": 0.0,
            "overall": 0.0,
        }
        result: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "scores": default_scores,
            "comparisons": comparisons,
            "ai_analysis": None,
            "ai_recommendations": [],
        }

        if self.agent and OPENAI_API_KEY:
            try:
                task = self._create_benchmark_task(
                    dashboard,
                    water_quality_data,
                    feed_data,
                    energy_data,
                    labor_data,
                    comparisons,
                    historical_snapshots,
                )
                crew = Crew(agents=[self.agent], tasks=[task], verbose=True)
                plan_result = crew.kickoff()
                analysis_text = str(plan_result) if plan_result else None
                result["ai_analysis"] = analysis_text
                result["ai_recommendations"] = self._extract_recommendations(analysis_text)
                parsed = self._extract_scores(analysis_text)
                if parsed:
                    result["scores"] = parsed
            except Exception as e:
                print(f"[BenchmarkingAgent] AI benchmark failed: {e}")
                result["ai_analysis"] = None

        return result

    def _build_comparisons(
        self,
        water_quality_data: List[WaterQualityData],
        feed_data: List[FeedData],
        energy_data: List[EnergyData],
        labor_data: List[LaborData],
    ) -> Dict[str, Any]:
        """Build current vs target comparisons for the UI."""
        ph_lo, ph_hi = BENCHMARK_TARGETS["ph_range"]
        temp_lo, temp_hi = BENCHMARK_TARGETS["temperature_range"]
        do_min = BENCHMARK_TARGETS["dissolved_oxygen_min"]

        wq = water_quality_data[0] if water_quality_data else None
        comparisons: Dict[str, Any] = {
            "water_quality": {
                "ph": {"current": wq.ph if wq else None, "target": f"{ph_lo}-{ph_hi}"},
                "temperature": {
                    "current": wq.temperature if wq else None,
                    "target": f"{temp_lo}-{temp_hi} °C",
                },
                "dissolved_oxygen": {
                    "current": wq.dissolved_oxygen if wq else None,
                    "target_min": do_min,
                },
            },
            "feed": {
                "ponds": len(feed_data),
                "total_feed_kg": round(
                    sum(f.feed_amount for f in feed_data) / 1000, 2
                ),
                "avg_weight_g": round(
                    sum(f.average_weight for f in feed_data) / len(feed_data), 2
                )
                if feed_data
                else None,
            },
            "energy": {
                "total_kwh": round(sum(e.total_energy for e in energy_data), 2),
                "total_cost": round(sum(e.cost for e in energy_data), 2),
                "avg_efficiency": round(
                    sum(e.efficiency_score for e in energy_data) / len(energy_data), 3
                )
                if energy_data
                else None,
            },
            "labor": {
                "total_hours": round(sum(l.time_spent for l in labor_data), 1),
                "total_workers": sum(l.worker_count for l in labor_data),
                "avg_efficiency": round(
                    sum(l.efficiency_score for l in labor_data) / len(labor_data), 3
                )
                if labor_data
                else None,
            },
        }
        return comparisons

    def _create_benchmark_task(
        self,
        dashboard: ShrimpFarmDashboard,
        water_quality_data: List[WaterQualityData],
        feed_data: List[FeedData],
        energy_data: List[EnergyData],
        labor_data: List[LaborData],
        comparisons: Dict[str, Any],
        historical_snapshots: List[Dict[str, Any]],
    ) -> Task:
        wq_summary = "\n".join(
            f"  Pond {w.pond_id}: pH={w.ph:.2f}, temp={w.temperature:.1f}°C, DO={w.dissolved_oxygen:.2f}, status={w.status.value}"
            for w in water_quality_data
        )
        feed_summary = "\n".join(
            f"  Pond {f.pond_id}: feed={f.feed_amount/1000:.2f} kg, weight={f.average_weight:.2f}g, freq={f.feeding_frequency}"
            for f in feed_data
        )
        energy_summary = "\n".join(
            f"  Pond {e.pond_id}: total={e.total_energy:.1f} kWh, cost={e.cost:.2f}, efficiency={e.efficiency_score:.2f}"
            for e in energy_data
        )
        labor_summary = "\n".join(
            f"  Pond {l.pond_id}: hours={l.time_spent}, workers={l.worker_count}, efficiency={l.efficiency_score:.2f}"
            for l in labor_data
        )

        description = f"""
        Benchmark this shrimp farm's current performance.

        Dashboard summary:
        - Overall health score: {dashboard.overall_health_score:.2f}
        - Feed efficiency: {dashboard.feed_efficiency:.2f}
        - Energy efficiency: {dashboard.energy_efficiency:.2f}
        - Labor efficiency: {dashboard.labor_efficiency:.2f}
        - Alerts: {dashboard.alerts}
        - Existing recommendations: {dashboard.recommendations}

        Current data:
        Water quality:
        {wq_summary}

        Feed:
        {feed_summary}

        Energy:
        {energy_summary}

        Labor:
        {labor_summary}

        Historical snapshots available: {len(historical_snapshots)}.

        Provide:
        1. A short executive summary (2-3 sentences) on how the farm compares to best practices.
        2. Top 3 strengths.
        3. Top 3-5 prioritized gaps or risks with clear, actionable recommendations.
        4. One key metric to improve first and why.
        5. Numerical scores (0-100) for the dashboard. Include exactly this line in your output (replace X with numbers):
           Scores (0-100): Water quality: X, Feed: X, Energy: X, Labor: X, Overall: X
        Keep the tone professional and concise. Output in clear sections.
        """

        return Task(
            description=description,
            agent=self.agent,
            expected_output="Structured benchmark report with executive summary, strengths, gaps, prioritized recommendations, and a Scores (0-100) line.",
        )

    @staticmethod
    def _extract_scores(analysis_text: Optional[str]) -> Optional[Dict[str, float]]:
        """Parse 'Scores (0-100): Water quality: X, Feed: X, ...' from LLM output."""
        if not analysis_text or not analysis_text.strip():
            return None
        # Match line like "Scores (0-100): Water quality: 75, Feed: 80, Energy: 70, Labor: 85, Overall: 77"
        pattern = (
            r"Scores\s*\(0-100\)\s*:\s*"
            r"Water\s*quality\s*:\s*([\d.]+)\s*,\s*"
            r"Feed\s*:\s*([\d.]+)\s*,\s*"
            r"Energy\s*:\s*([\d.]+)\s*,\s*"
            r"Labor\s*:\s*([\d.]+)\s*,\s*"
            r"Overall\s*:\s*([\d.]+)"
        )
        match = re.search(pattern, analysis_text, re.IGNORECASE)
        if not match:
            return None
        try:
            wq, feed, energy, labor, overall = (float(x) for x in match.groups())
            return {
                "water_quality": round(min(100, max(0, wq)), 1),
                "feed": round(min(100, max(0, feed)), 1),
                "energy": round(min(100, max(0, energy)), 1),
                "labor": round(min(100, max(0, labor)), 1),
                "overall": round(min(100, max(0, overall)), 1),
            }
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _extract_recommendations(analysis_text: Optional[str]) -> List[str]:
        """Heuristic: split by newlines and return lines that look like recommendations."""
        if not analysis_text or not analysis_text.strip():
            return []
        lines = [s.strip() for s in analysis_text.split("\n") if s.strip()]
        recs = []
        for line in lines:
            if any(
                line.lower().startswith(p)
                for p in ("- ", "* ", "• ", "1.", "2.", "3.", "4.", "5.", "recommend", "improve", "consider", "prioritize")
            ):
                recs.append(line.lstrip("-*• 123456789."))
            elif ":" in line and len(line) > 20:
                recs.append(line)
        return recs[:10]
