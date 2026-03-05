from crewai import Agent, Task, Crew

# LangChain has moved OpenAI chat models across packages over time.
# Try the modern import first, then fall back for older LangChain versions.
try:
    from langchain_openai import ChatOpenAI  # type: ignore
except Exception:  # pragma: no cover
    from langchain.chat_models import ChatOpenAI  # type: ignore
from models import LaborData, WaterQualityData, EnergyData
from config import OPENAI_API_KEY, OPENAI_MODEL_NAME, OPENAI_TEMPERATURE, USE_MONGODB
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any

class LaborOptimizationAgent:
    def __init__(self):
        # LLM is optional; simulation mode and downstream dashboards should work without an OpenAI key.
        self.llm = None
        self.agent = None
        self.repository = None
        
        # Initialize MongoDB repository if enabled
        if USE_MONGODB:
            try:
                from database.repository import DataRepository
                self.repository = DataRepository()
            except Exception as e:
                print(f"Warning: Could not initialize MongoDB repository: {e}")

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

    def optimize_labor(
        self,
        pond_id: int,
        water_quality_data: WaterQualityData,
        energy_data: EnergyData,
        labor_data: LaborData,
    ) -> Dict[str, Any]:
        """
        Run AI labor optimization (CrewAI + LLM) for one pond. Returns a dict with ai_plan
        plus rule-based schedule, recommendations, and metrics for API/UI compatibility.
        """
        result: Dict[str, Any] = {
            "pond_id": pond_id,
            "ai_plan": None,
            "schedule": self._build_schedule(labor_data, water_quality_data, energy_data),
            "recommendations": self._build_recommendations(
                labor_data, water_quality_data, energy_data
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
        """Get labor data from MongoDB, or generate from WQ and energy if unavailable."""
        if self.repository and self.repository.is_available:
            try:
                data = self.repository.get_latest_labor_data(pond_id)
                if data:
                    print(f"[DB] Fetched labor data for pond {pond_id} from MongoDB")
                    return data
            except Exception as e:
                print(f"[Labor] DB fetch failed for pond {pond_id}, generating: {e}")
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
        morning_workers = min(1, w)
        w -= morning_workers
        afternoon_workers = min(1, w)
        w -= afternoon_workers
        evening_workers = w

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

    def _build_recommendations(
        self,
        labor_data: LaborData,
        water_quality_data: WaterQualityData,
        energy_data: EnergyData,
    ) -> List[Dict[str, Any]]:
        """Build rule-based recommendations for API compatibility."""
        recs: List[Dict[str, Any]] = []
        if labor_data.efficiency_score < 0.7:
            recs.append({
                "category": "Labor efficiency",
                "priority": "high",
                "recommendation": "Improve task batching and reduce idle time to raise efficiency score.",
                "expected_improvement": "10–15% efficiency gain",
            })
        if labor_data.worker_count >= 2 and len(labor_data.tasks_completed) < 3:
            recs.append({
                "category": "Workforce allocation",
                "priority": "medium",
                "recommendation": "Consider reallocating workers or adding higher-priority tasks.",
            })
        if water_quality_data.status.value in ["poor", "critical"]:
            recs.append({
                "category": "Labor priority",
                "priority": "high",
                "recommendation": "Prioritize water quality and aeration tasks in the next shifts.",
            })
        if energy_data.efficiency_score < 0.7:
            recs.append({
                "category": "Energy",
                "priority": "medium",
                "recommendation": "Schedule equipment inspection and energy audit in afternoon shift.",
            })
        if not recs:
            recs.append({
                "category": "Maintenance",
                "priority": "low",
                "recommendation": "Keep current schedule; ensure safety equipment check is done daily.",
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
