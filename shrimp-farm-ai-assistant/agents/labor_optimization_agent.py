import json
import re
from crewai import Agent, Task, Crew

# LangChain has moved OpenAI chat models across packages over time.
# Try the modern import first, then fall back for older LangChain versions.
try:
    from langchain_openai import ChatOpenAI  # type: ignore
except Exception:  # pragma: no cover
    from langchain.chat_models import ChatOpenAI  # type: ignore
from models import LaborData, WaterQualityData, EnergyData
from config import OPENAI_API_KEY, OPENAI_MODEL_NAME, OPENAI_TEMPERATURE, USE_MONGODB, USE_READINGS_ONLY
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any

class LaborOptimizationAgent:
    def __init__(self):
        # LLM is optional; simulation mode and downstream dashboards should work without an OpenAI key.
        self.llm = None
        self.agent = None
        self.repository = None
        
        # Shrimp-farm-ai-assistant uses only MongoDB for data when USE_MONGODB is true
        if USE_MONGODB:
            from database.repository import DataRepository
            self.repository = DataRepository()

        if OPENAI_API_KEY:
            self.llm = ChatOpenAI(
                openai_api_key=OPENAI_API_KEY,
                model_name=OPENAI_MODEL_NAME,
                temperature=OPENAI_TEMPERATURE,
            )

            self.agent = Agent(
                role="Labor Efficiency Specialist",
                goal="Optimize labor allocation and task scheduling to maximize farm productivity while ensuring worker safety and job satisfaction",
                backstory="""You are a workforce management expert with 8 years of experience in aquaculture operations. 
                You understand the complex scheduling needs of shrimp farming, including feeding, maintenance, 
                monitoring, and emergency response. You can identify inefficiencies and optimize labor allocation.""",
                verbose=True,
                allow_delegation=False,
                llm=self.llm,
            )
    
    def create_labor_optimization_task(
        self,
        pond_id: int,
        water_quality_data: WaterQualityData,
        energy_data: EnergyData,
        labor_data_list: List[LaborData],
    ) -> Task:
        """Build task description from recent labor history (one or more snapshots)."""
        if not labor_data_list:
            labor_section = "No recent labor history available (use current conditions only)."
        elif len(labor_data_list) == 1:
            d = labor_data_list[0]
            labor_section = f"""
            Current Labor Status:
            - Tasks Completed: {', '.join(d.tasks_completed)}
            - Time Spent: {d.time_spent} hours
            - Worker Count: {d.worker_count}
            - Efficiency Score: {d.efficiency_score}
            - Next Tasks: {', '.join(d.next_tasks)}
            """
        else:
            lines = ["Recent labor history (most recent first); use trends in your analysis:\n"]
            for i, d in enumerate(labor_data_list, 1):
                ts = d.timestamp.strftime("%Y-%m-%d %H:%M") if hasattr(d.timestamp, "strftime") else str(d.timestamp)
                lines.append(
                    f"  Snapshot {i} ({ts}): Tasks: {', '.join(d.tasks_completed)}; "
                    f"Time: {d.time_spent}h; Workers: {d.worker_count}; "
                    f"Efficiency: {d.efficiency_score}; Next: {', '.join(d.next_tasks)}"
                )
            labor_section = "\n".join(lines)

        return Task(
            description=f"""
            Analyze and optimize labor allocation for Pond {pond_id}:

            {labor_section}

            Farm Conditions:
            - Water Quality: pH={water_quality_data.ph:.2f}, Temp={water_quality_data.temperature:.1f}°C
            - Energy Status: {energy_data.efficiency_score:.2f} efficiency
            - Alerts: {len(water_quality_data.alerts)} active alerts

            Optimization Analysis Required:
            1. Analyze labor efficiency and task completion rates (use recent history trends if available)
            2. Identify bottlenecks and inefficiencies in task scheduling
            3. Recommend optimal worker allocation based on farm conditions
            4. Suggest task prioritization based on urgency and impact
            5. Propose automation opportunities to reduce manual labor
            6. Calculate potential productivity improvements
            7. Ensure worker safety and workload balance
            8. Provide scheduling recommendations for next 24-48 hours

            Return comprehensive labor optimization plan with scheduling and efficiency recommendations.
            """,
            agent=self.agent,
            expected_output="Detailed labor optimization plan with scheduling, task prioritization, and efficiency improvements",
        )

    def _minimal_fallback_schedule(self, labor_data: LaborData) -> Dict[str, Any]:
        """Minimal schedule when LLM is unavailable or returns invalid. Uses worker_count (cap 5), no rule-based logic."""
        w = min(5, max(1, labor_data.worker_count))
        def _tasks(base: List[str], n: int) -> List[str]:
            return [base[i % len(base)] for i in range(n)] if base else ["Monitoring"] * n
        return {
            "morning_shift": {
                "time": "06:00",
                "tasks": _tasks(["Water quality testing", "Feed distribution", "Data recording"], w),
                "workers": w,
            },
            "afternoon_shift": {
                "time": "12:00",
                "tasks": _tasks(["Equipment maintenance", "Monitoring", "Aeration check"], w),
                "workers": w,
            },
            "evening_shift": {
                "time": "18:00",
                "tasks": _tasks(["Data recording", "Next feeding cycle", "Safety equipment check"], w),
                "workers": w,
            },
        }

    def optimize_labor(
        self,
        pond_id: int,
        water_quality_data: WaterQualityData,
        energy_data: EnergyData,
        labor_data: LaborData,
    ) -> Dict[str, Any]:
        """
        Run AI labor optimization (CrewAI + LLM) for one pond. Returns a dict with ai_plan,
        schedule (from LLM only; minimal fallback when LLM unavailable or fails), and metrics.
        """
        schedule: Optional[Dict[str, Any]] = None
        if self.llm is not None:
            try:
                schedule = self._build_schedule_with_llm(labor_data, water_quality_data, energy_data)
            except Exception:
                schedule = None
        if schedule is None or not isinstance(schedule, dict):
            schedule = self._minimal_fallback_schedule(labor_data)
        result: Dict[str, Any] = {
            "pond_id": pond_id,
            "ai_plan": None,
            "schedule": schedule,
            "recommendations": self._build_recommendations(
                pond_id, labor_data, water_quality_data, energy_data
            ),
            "metrics": self._build_metrics(labor_data),
        }
        if self.agent and OPENAI_API_KEY:
            try:
                labor_history = self.get_recent_labor_data(pond_id, limit=7)
                # Always put current snapshot first; add DB history without duplicating by timestamp
                combined: List[LaborData] = [labor_data]
                if labor_history:
                    for L in labor_history:
                        if L.timestamp != labor_data.timestamp:
                            combined.append(L)
                    combined = combined[:7]
                task = self.create_labor_optimization_task(
                    pond_id, water_quality_data, energy_data, combined
                )
                crew = Crew(agents=[self.agent], tasks=[task], verbose=True)
                plan_result = crew.kickoff()
                result["ai_plan"] = str(plan_result) if plan_result else None
            except Exception as e:
                print(f"[LaborOptimizationAgent] AI optimization failed for pond {pond_id}: {e}")
        else:
            if not OPENAI_API_KEY:
                print("[LaborOptimizationAgent] OPENAI_API_KEY not set; labor optimization requires an API key.")
        return result

    def optimize_all_labor(
        self,
        water_quality_data: List[WaterQualityData],
        energy_data: List[EnergyData],
        labor_data: List[LaborData],
    ) -> List[Dict[str, Any]]:
        """Run labor optimization for all ponds. Returns list of per-pond optimization results."""
        results = []
        for wq, energy, labor in zip(water_quality_data, energy_data, labor_data):
            results.append(
                self.optimize_labor(wq.pond_id, wq, energy, labor)
            )
        return results
    
    def get_recent_labor_data(self, pond_id: int, limit: int = 7) -> List[LaborData]:
        """Get recent labor history from MongoDB (most recent first). Returns [] if DB unavailable or no data."""
        if not self.repository or not self.repository.is_available:
            return []
        try:
            return self.repository.get_labor_data(pond_id=pond_id, limit=limit)
        except Exception as e:
            print(f"[Labor] Could not fetch recent labor history for pond {pond_id}: {e}")
            return []

    def get_labor_data(self, pond_id: int, water_quality_data: Optional[WaterQualityData] = None,
                      energy_data: Optional[EnergyData] = None) -> LaborData:
        """Get labor data from MongoDB. Raises if DB unavailable or no data."""
        if not self.repository or not self.repository.is_available:
            raise ValueError(f"MongoDB repository not available. Cannot fetch labor data for pond {pond_id}")
        
        try:
            data = self.repository.get_latest_labor_data(pond_id)
            if data:
                print(f"[DB] Fetched labor data for pond {pond_id} from MongoDB")
                return data
            else:
                raise ValueError(f"No labor data found in database for pond {pond_id}")
        except Exception as e:
            print(f"Error: Could not fetch from MongoDB: {e}")
            raise

    def generate_labor_data(
        self,
        pond_id: int,
        water_quality_data: WaterQualityData,
        energy_data: EnergyData,
    ) -> LaborData:
        """Generate simulated labor data from water quality and energy (no DB required)."""
        base_tasks = ["Water quality testing", "Feed distribution", "Data recording"]
        if water_quality_data.status.value in ["poor", "critical"]:
            base_tasks.append("Emergency aeration check")
        if water_quality_data.ammonia > 0.2:
            base_tasks.append("Water exchange")
        if energy_data.efficiency_score < 0.7:
            base_tasks.append("Equipment inspection")
        if water_quality_data.dissolved_oxygen < 5 and "Aeration check" not in base_tasks:
            base_tasks.append("Aeration check")

        time_spent = len(base_tasks) * 0.5
        if water_quality_data.status.value in ["poor", "critical"]:
            time_spent *= 1.3
        if len(water_quality_data.alerts) > 0:
            time_spent *= 1.2

        worker_count = 1
        if len(base_tasks) >= 5 or water_quality_data.status.value == "critical":
            worker_count = 2
        if water_quality_data.status.value == "critical":
            worker_count = 3

        next_tasks = self._generate_next_tasks(
            water_quality_data, energy_data, base_tasks
        )
        efficiency_score = self._calculate_labor_efficiency(
            base_tasks, time_spent, worker_count, water_quality_data
        )

        return LaborData(
            timestamp=datetime.now(),
            pond_id=pond_id,
            tasks_completed=base_tasks,
            time_spent=round(time_spent, 1),
            worker_count=worker_count,
            efficiency_score=round(efficiency_score, 2),
            next_tasks=next_tasks,
        )

    # Alias for Streamlit dashboard and callers that expect "simulate"
    simulate_labor_data = generate_labor_data

    def get_or_generate_labor_data(
        self,
        pond_id: int,
        water_quality_data: WaterQualityData,
        energy_data: EnergyData,
    ) -> LaborData:
        """Get labor data from MongoDB (labor_readings), or simulated when allowed."""
        if self.repository and self.repository.is_available:
            try:
                data = self.repository.get_latest_labor_data(pond_id)
                if data:
                    print(f"[DB] Fetched labor data for pond {pond_id} from MongoDB")
                    return data
            except Exception as e:
                print(f"Error: Could not fetch labor data from MongoDB: {e}")
        if USE_READINGS_ONLY:
            raise ValueError(
                f"USE_READINGS_ONLY=true: no labor_readings row for pond {pond_id}. "
                "Populate MongoDB or set USE_READINGS_ONLY=false."
            )
        return self.generate_labor_data(pond_id, water_quality_data, energy_data)

    def _build_schedule(
        self,
        labor_data: LaborData,
        water_quality_data: WaterQualityData,
        energy_data: EnergyData,
    ) -> Dict[str, Any]:
        """Build morning/afternoon/evening shift schedule from labor data and conditions."""
        tasks = list(labor_data.next_tasks) if labor_data.next_tasks else list(labor_data.tasks_completed)
        if not tasks:
            tasks = ["Water quality testing", "Feed distribution", "Data recording"]

        # Assign tasks to shifts by type when possible; otherwise round-robin
        morning_keywords = ["feeding", "feed", "aeration", "equipment", "safety", "water quality testing"]
        afternoon_keywords = ["maintenance", "audit", "optimization", "pH", "treatment"]
        evening_keywords = ["recording", "data", "next feeding", "check"]

        def which_shift(task: str) -> int:
            t = task.lower()
            for k in morning_keywords:
                if k in t:
                    return 0
            for k in afternoon_keywords:
                if k in t:
                    return 1
            for k in evening_keywords:
                if k in t:
                    return 2
            return -1

        shifts_tasks: List[List[str]] = [[], [], []]
        for task in tasks:
            idx = which_shift(task)
            if idx >= 0:
                shifts_tasks[idx].append(task)
            else:
                min_idx = min(range(3), key=lambda j: len(shifts_tasks[j]))
                shifts_tasks[min_idx].append(task)

        # If no tasks were assigned (all unclassified and empty), spread by index
        if tasks and sum(len(s) for s in shifts_tasks) == 0:
            for i, t in enumerate(tasks):
                shifts_tasks[i % 3].append(t)

        w = max(1, labor_data.worker_count)
        # Allow the same worker(s) to be shown across all three shifts so the schedule is always full
        morning_workers = min(1, w)
        afternoon_workers = min(1, w)
        evening_workers = min(1, w)

        schedule: Dict[str, Any] = {}
        if shifts_tasks[0] or morning_workers > 0:
            schedule["morning_shift"] = {
                "time": "06:00",
                "tasks": shifts_tasks[0] or ["Water quality testing", "Feed distribution"],
                "workers": morning_workers if shifts_tasks[0] else 1,
            }
        if shifts_tasks[1] or afternoon_workers > 0:
            schedule["afternoon_shift"] = {
                "time": "12:00",
                "tasks": shifts_tasks[1] or ["Equipment maintenance", "Monitoring"],
                "workers": afternoon_workers if shifts_tasks[1] else 1,
            }
        if shifts_tasks[2] or evening_workers > 0:
            schedule["evening_shift"] = {
                "time": "18:00",
                "tasks": shifts_tasks[2] or ["Data recording", "Next feeding cycle"],
                "workers": evening_workers if shifts_tasks[2] else 1,
            }
        return schedule

    def _build_schedule_with_llm(
        self,
        labor_data: LaborData,
        water_quality_data: WaterQualityData,
        energy_data: EnergyData,
    ) -> Optional[Dict[str, Any]]:
        """Build morning/afternoon/evening shift schedule using the LLM. Returns None if LLM unavailable or response invalid."""
        if self.llm is None:
            return None
        tasks_ref = list(labor_data.next_tasks) if labor_data.next_tasks else list(labor_data.tasks_completed)
        if not tasks_ref:
            tasks_ref = ["Water quality testing", "Feed distribution", "Data recording"]
        # Option 1: use fetched worker count (cap at 5 for UI) so schedule spreads across all available workers
        display_workers = min(5, max(1, labor_data.worker_count))
        example_json = (
            '{"morning_shift": {"time": "06:00", "tasks": ["Feed distribution", "Water quality testing", "Data recording"], "workers": %s}, '
            '"afternoon_shift": {"time": "12:00", "tasks": ["Equipment maintenance", "Monitoring", "Aeration check"], "workers": %s}, '
            '"evening_shift": {"time": "18:00", "tasks": ["Data recording", "Next feeding cycle", "Safety equipment check"], "workers": %s}}'
            % (display_workers, display_workers, display_workers)
        )
        prompt = f"""You are a labor scheduler for a shrimp farm. Assign tasks across ALL {display_workers} available workers for each shift. Given the following data, output a single JSON object with exactly three keys: morning_shift, afternoon_shift, evening_shift. Each shift must have: "time" (string like "06:00"), "tasks" (array of exactly {display_workers} task name strings, one per worker), "workers" (integer {display_workers}). Use concrete task names from the provided tasks or standard farm tasks (e.g. "Feed distribution", "Water quality testing", "Data recording", "Equipment maintenance", "Aeration check", "Monitoring"). Output only the JSON object, no markdown or other text.

Data:
- Available workers (assign ALL of them): {display_workers}
- Tasks to schedule (prefer these): {', '.join(tasks_ref)}
- Labor: efficiency_score={labor_data.efficiency_score}, time_spent={labor_data.time_spent}h
- Water: pH={water_quality_data.ph:.2f}, temp={water_quality_data.temperature:.1f}C, dissolved_oxygen={water_quality_data.dissolved_oxygen:.2f}, status={water_quality_data.status.value}, alerts={len(water_quality_data.alerts)}
- Energy: efficiency_score={energy_data.efficiency_score:.2f}, total_energy={energy_data.total_energy:.1f} kWh, cost={energy_data.cost:.1f}

Example format (use workers: {display_workers} and {display_workers} tasks per shift):
{example_json}
"""
        try:
            try:
                from langchain_core.messages import HumanMessage  # type: ignore
                resp = self.llm.invoke([HumanMessage(content=prompt)])
            except Exception:
                try:
                    from langchain.schema import HumanMessage  # type: ignore
                    resp = self.llm.invoke([HumanMessage(content=prompt)])
                except Exception:
                    resp = self.llm.invoke(prompt)
            text = str(resp.content).strip() if hasattr(resp, "content") else str(resp).strip()
            json_match = re.search(r"\{[\s\S]*\}", text)
            if not json_match:
                return None
            data = json.loads(json_match.group())
            if not isinstance(data, dict):
                return None
            # Option 1: use fetched worker count (cap at 5) so schedule spreads across all available workers
            max_workers = min(5, max(1, labor_data.worker_count))
            default_times = {"morning_shift": "06:00", "afternoon_shift": "12:00", "evening_shift": "18:00"}
            default_task_lists = {
                "morning_shift": ["Water quality testing", "Feed distribution"],
                "afternoon_shift": ["Equipment maintenance", "Monitoring"],
                "evening_shift": ["Data recording", "Next feeding cycle"],
            }
            schedule: Dict[str, Any] = {}
            for key in ("morning_shift", "afternoon_shift", "evening_shift"):
                raw = data.get(key)
                if raw is None or not isinstance(raw, dict):
                    continue
                workers = raw.get("workers")
                try:
                    workers = max(0, int(workers)) if workers is not None else 0
                except (TypeError, ValueError):
                    workers = 0
                workers = min(workers, max_workers)
                # Option 1: if LLM returned fewer workers than available, use all available
                if workers < max_workers:
                    workers = max_workers
                tasks_raw = raw.get("tasks")
                if isinstance(tasks_raw, list):
                    tasks = [str(t) for t in tasks_raw if isinstance(t, str)]
                else:
                    tasks = default_task_lists.get(key, [])
                if not tasks:
                    tasks = default_task_lists.get(key, [])
                # Pad tasks to at least max_workers so each worker gets one (cycle if needed)
                if len(tasks) < max_workers:
                    base = tasks or default_task_lists.get(key, ["Monitoring"])
                    tasks = [base[i % len(base)] for i in range(max_workers)]
                time_str = str(raw.get("time", default_times[key]))[:5] if raw.get("time") else default_times[key]
                schedule[key] = {
                    "time": time_str,
                    "tasks": tasks[:max_workers],
                    "workers": workers,
                }
            if max_workers >= 1:
                for key in ("morning_shift", "afternoon_shift", "evening_shift"):
                    if key not in schedule:
                        def_tasks = default_task_lists.get(key, ["Monitoring"])
                        pad_tasks = [def_tasks[i % len(def_tasks)] for i in range(max_workers)] if def_tasks else ["Monitoring"] * max_workers
                        schedule[key] = {
                            "time": default_times[key],
                            "tasks": pad_tasks[:max_workers],
                            "workers": max_workers,
                        }
            if not schedule:
                return None
            return schedule
        except Exception as e:
            print(f"[LaborOptimizationAgent] LLM schedule build failed: {e}")
            return None

    def _build_llm_recommendations(
        self,
        pond_id: int,
        labor_data: LaborData,
        water_quality_data: WaterQualityData,
        energy_data: EnergyData,
    ) -> List[Dict[str, Any]]:
        """Generate 2–4 short AI recommendations from current/DB labor and pond data. Returns [] if LLM unavailable or fails."""
        if self.llm is None:
            return []
        tasks_done = ", ".join(labor_data.tasks_completed[:8]) if labor_data.tasks_completed else "None"
        next_t = ", ".join(labor_data.next_tasks[:6]) if labor_data.next_tasks else "None"
        prompt = f"""You are a labor optimization expert for a shrimp farm. Based on the following data for Pond {pond_id}, give exactly 2 to 4 short, actionable recommendations (one sentence each). Use the exact labor and pond data provided; do not repeat the same generic line for every pond.

Pond {pond_id} – Labor (from farm/DB when available):
- Tasks completed: {tasks_done}
- Next tasks: {next_t}
- Workers: {labor_data.worker_count}, Time spent: {labor_data.time_spent}h, Efficiency score: {labor_data.efficiency_score:.2f}

Water quality: pH={water_quality_data.ph:.2f}, temp={water_quality_data.temperature:.1f}C, DO={water_quality_data.dissolved_oxygen:.2f}, status={water_quality_data.status.value}. Alerts: {len(water_quality_data.alerts)}.

Energy: efficiency={energy_data.efficiency_score:.2f}, cost={energy_data.cost:.1f}.

Output only a JSON array of 2–4 objects, each with "recommendation" (string) and "priority" ("high" or "medium" or "low"). No other text.
Example: [{{"recommendation": "Add aeration check to morning shift given current DO.", "priority": "high"}}]
"""
        try:
            try:
                from langchain_core.messages import HumanMessage
                resp = self.llm.invoke([HumanMessage(content=prompt)])
            except Exception:
                try:
                    from langchain.schema import HumanMessage
                    resp = self.llm.invoke([HumanMessage(content=prompt)])
                except Exception:
                    resp = self.llm.invoke(prompt)
            text = str(resp.content).strip() if hasattr(resp, "content") else str(resp).strip()
            json_match = re.search(r"\[[\s\S]*\]", text)
            if not json_match:
                return []
            arr = json.loads(json_match.group())
            if not isinstance(arr, list):
                return []
            recs: List[Dict[str, Any]] = []
            for i, item in enumerate(arr[:4]):
                if not isinstance(item, dict):
                    continue
                rec = str(item.get("recommendation") or "").strip()
                if not rec:
                    continue
                recs.append({
                    "category": "AI recommendation",
                    "priority": (str(item.get("priority") or "medium").lower())[:10],
                    "recommendation": rec,
                })
            return recs
        except Exception as e:
            print(f"[LaborOptimizationAgent] LLM recommendations failed: {e}")
            return []

    def _build_recommendations(
        self,
        pond_id: int,
        labor_data: LaborData,
        water_quality_data: WaterQualityData,
        energy_data: EnergyData,
    ) -> List[Dict[str, Any]]:
        """Build recommendations from DB/current data: LLM when available, else rule-based (pond-specific)."""
        recs: List[Dict[str, Any]] = []
        # Prefer LLM recommendations based on actual labor and pond data
        llm_recs = self._build_llm_recommendations(pond_id, labor_data, water_quality_data, energy_data)
        if llm_recs:
            return llm_recs
        # Rule-based fallback (data-driven, pond-specific where possible)
        if labor_data.efficiency_score < 0.7:
            recs.append({
                "category": "Labor efficiency",
                "priority": "high",
                "recommendation": f"Pond {pond_id}: Improve task batching and reduce idle time to raise efficiency score.",
                "expected_improvement": "10–15% efficiency gain",
            })
        if labor_data.worker_count >= 2 and len(labor_data.tasks_completed) < 3:
            recs.append({
                "category": "Workforce allocation",
                "priority": "medium",
                "recommendation": f"Pond {pond_id}: Consider reallocating workers or adding higher-priority tasks.",
            })
        if water_quality_data.status.value in ["poor", "critical"]:
            recs.append({
                "category": "Labor priority",
                "priority": "high",
                "recommendation": f"Pond {pond_id}: Prioritize water quality and aeration tasks in the next shifts.",
            })
        if energy_data.efficiency_score < 0.7:
            recs.append({
                "category": "Energy",
                "priority": "medium",
                "recommendation": f"Pond {pond_id}: Schedule equipment inspection and energy audit in afternoon shift.",
            })
        if not recs:
            recs.append({
                "category": "Maintenance",
                "priority": "low",
                "recommendation": f"Pond {pond_id}: Keep current schedule; ensure safety equipment check is done daily.",
            })
        return recs

    def _build_metrics(self, labor_data: LaborData) -> Dict[str, Any]:
        """Build labor metrics for API compatibility."""
        n_tasks = len(labor_data.tasks_completed) or 1
        hours = max(0.1, labor_data.time_spent)
        workers = max(1, labor_data.worker_count)
        tasks_per_hour = round(n_tasks / hours, 1)
        tasks_per_worker = round(n_tasks / workers, 1)
        # Placeholder cost: assume $15/hour per worker
        cost_per_hour = 15.0
        total_labor_cost = round(workers * hours * cost_per_hour, 2)
        cost_per_task = round(total_labor_cost / n_tasks, 2) if n_tasks else 0
        return {
            "tasks_per_hour": tasks_per_hour,
            "tasks_per_worker": tasks_per_worker,
            "cost_per_task": cost_per_task,
            "efficiency_score": labor_data.efficiency_score,
            "total_labor_cost": total_labor_cost,
        }

    def _calculate_labor_efficiency(self, completed_tasks: List[str], time_spent: float, 
                                  worker_count: int, water_quality_data: WaterQualityData) -> float:
        """Calculate labor efficiency score"""
        base_score = 0.8
        
        # Task completion efficiency
        if len(completed_tasks) >= 4:
            base_score += 0.1
        elif len(completed_tasks) < 2:
            base_score -= 0.1
        
        # Time efficiency
        expected_time = len(completed_tasks) * 0.5
        if time_spent <= expected_time:
            base_score += 0.05
        elif time_spent > expected_time * 1.5:
            base_score -= 0.1
        
        # Worker allocation efficiency
        if worker_count == 1 and len(completed_tasks) <= 3:
            base_score += 0.05
        elif worker_count > 2 and len(completed_tasks) < 4:
            base_score -= 0.05
        
        # Water quality impact
        if water_quality_data.status.value in ["excellent", "good"]:
            base_score += 0.05
        elif water_quality_data.status.value in ["poor", "critical"]:
            base_score -= 0.1
        
        return min(1.0, max(0.0, base_score))
    
    def _generate_next_tasks(self, water_quality_data: WaterQualityData, 
                           energy_data: EnergyData, completed_tasks: List[str]) -> List[str]:
        """Generate next priority tasks based on current conditions"""
        next_tasks = []
        
        # Regular maintenance tasks
        if "Equipment maintenance" not in completed_tasks:
            next_tasks.append("Equipment maintenance")
        if "Data recording" not in completed_tasks:
            next_tasks.append("Data recording")
        
        # Water quality based tasks
        if water_quality_data.dissolved_oxygen < 5 and "Aeration check" not in completed_tasks:
            next_tasks.append("Aeration check")
        if water_quality_data.ph < 7.5 or water_quality_data.ph > 8.5:
            next_tasks.append("pH adjustment")
        if water_quality_data.ammonia > 0.2:
            next_tasks.append("Water quality treatment")
        
        # Energy efficiency tasks
        if energy_data.efficiency_score < 0.7:
            next_tasks.append("Energy audit")
        if energy_data.aerator_usage > 20:
            next_tasks.append("Aerator optimization")
        
        # Feeding tasks
        next_tasks.append("Next feeding cycle")
        
        # Safety tasks
        next_tasks.append("Safety equipment check")
        
        return next_tasks[:5]  # Limit to 5 next tasks
