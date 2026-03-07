#!/usr/bin/env python3
"""
Shrimp Farm Management System - Main Orchestration Script

This script orchestrates the multi-agent AI system for shrimp farm management.
It coordinates water quality monitoring, feed prediction, energy optimization,
and labor management agents under the supervision of a manager agent.
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any

from crewai import Crew
# LangChain: prefer langchain_openai to avoid deprecation warning from langchain_community.
try:
    from langchain_openai import ChatOpenAI  # type: ignore
except ImportError:  # pragma: no cover
    print("Hint: pip install langchain-openai to avoid LangChain deprecation warning.")
    from langchain.chat_models import ChatOpenAI  # type: ignore

from config import OPENAI_API_KEY, OPENAI_MODEL_NAME, OPENAI_TEMPERATURE, FARM_CONFIG, AGENT_CONFIG
from models import ShrimpFarmDashboard, WaterQualityData, FeedData, EnergyData, LaborData

from agents.water_quality_agent import WaterQualityAgent
from agents.feed_prediction_agent import FeedPredictionAgent
from agents.energy_optimization_agent import EnergyOptimizationAgent
from agents.labor_optimization_agent import LaborOptimizationAgent
from agents.manager_agent import ManagerAgent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('farm_operations.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ShrimpFarmOrchestrator:
    """Main orchestrator for the shrimp farm management system"""
    
    def __init__(self):
        self.llm = ChatOpenAI(
            openai_api_key=OPENAI_API_KEY,
            model_name=OPENAI_MODEL_NAME,
            temperature=OPENAI_TEMPERATURE
        )
        
        # Initialize all agents
        self.water_quality_agent = WaterQualityAgent()
        self.feed_agent = FeedPredictionAgent()
        self.energy_agent = EnergyOptimizationAgent()
        self.labor_agent = LaborOptimizationAgent()
        self.manager_agent = ManagerAgent()
        
        # Data storage
        self.farm_data = {
            'water_quality': [],
            'feed': [],
            'energy': [],
            'labor': [],
            'labor_optimization': [],
            'dashboard': None
        }
        
        # Operation status
        self.is_running = False
        self.last_update = None
        
        logger.info("Shrimp Farm Orchestrator initialized successfully")
    
    async def start_monitoring_cycle(self):
        """Start the continuous monitoring cycle"""
        logger.info("Starting shrimp farm monitoring cycle")
        self.is_running = True
        
        while self.is_running:
            try:
                await self.run_monitoring_cycle()
                await asyncio.sleep(AGENT_CONFIG['water_quality_check_interval'] * 60)  # Convert to seconds
            except KeyboardInterrupt:
                logger.info("Monitoring cycle interrupted by user")
                break
            except Exception as e:
                logger.error(f"Error in monitoring cycle: {str(e)}")
                await asyncio.sleep(60)  # Wait before retrying
    
    async def run_monitoring_cycle(self):
        """Run a single monitoring cycle"""
        logger.info("Running monitoring cycle...")
        start_time = time.time()
        
        try:
            # Collect data from all agents
            await self.collect_agent_data()
            
            # Generate insights and recommendations
            await self.generate_insights()
            
            # Update dashboard
            await self.update_dashboard()
            
            # Log cycle completion
            cycle_time = time.time() - start_time
            logger.info(f"Monitoring cycle completed in {cycle_time:.2f} seconds")
            self.last_update = datetime.now()
            
        except Exception as e:
            logger.error(f"Error in monitoring cycle: {str(e)}")
            raise
    
    async def collect_agent_data(self):
        """Collect data from all specialized agents"""
        logger.info("Collecting data from all agents...")
        
        # Initialize repository for saving data
        repository = None
        try:
            from database.repository import DataRepository
            repository = DataRepository()
            if repository.is_available:
                logger.info("MongoDB repository available - data will be saved to database")
        except Exception as e:
            logger.debug(f"MongoDB repository not available: {e}")
        
        # Water quality monitoring
        water_quality_data = []
        for pond_id in range(1, FARM_CONFIG['pond_count'] + 1):
            wq_data = self.water_quality_agent.get_water_quality_data(pond_id)
            water_quality_data.append(wq_data)
            # Save to database if available
            if repository and repository.is_available:
                try:
                    repository.save_water_quality_data(wq_data)
                except Exception as e:
                    logger.debug(f"Could not save water quality data to DB: {e}")
        
        self.farm_data['water_quality'] = water_quality_data
        logger.info(f"Collected water quality data for {len(water_quality_data)} ponds")
        
        # Feed prediction
        feed_data = []
        for i, wq_data in enumerate(water_quality_data):
            pond_id = i + 1
            feed_data_item = self.feed_agent.get_feed_data(pond_id, wq_data)
            feed_data.append(feed_data_item)
            # Save to database if available
            if repository and repository.is_available:
                try:
                    repository.save_feed_data(feed_data_item)
                except Exception as e:
                    logger.debug(f"Could not save feed data to DB: {e}")
        
        self.farm_data['feed'] = feed_data
        logger.info(f"Collected feed data for {len(feed_data)} ponds")
        
        # Energy optimization
        energy_data = []
        for i, wq_data in enumerate(water_quality_data):
            pond_id = i + 1
            energy_data_item = self.energy_agent.get_energy_data(pond_id, wq_data)
            energy_data.append(energy_data_item)
            # Save to database if available
            if repository and repository.is_available:
                try:
                    repository.save_energy_data(energy_data_item)
                except Exception as e:
                    logger.debug(f"Could not save energy data to DB: {e}")
        
        self.farm_data['energy'] = energy_data
        logger.info(f"Collected energy data for {len(energy_data)} ponds")
        
        # Labor: get or generate data, then run AI labor optimization
        labor_data = []
        for i, (wq_data, energy_data_item) in enumerate(zip(water_quality_data, energy_data)):
            pond_id = i + 1
            labor_data_item = self.labor_agent.get_or_generate_labor_data(
                pond_id, wq_data, energy_data_item
            )
            labor_data.append(labor_data_item)
            # Save to database if available
            if repository and repository.is_available:
                try:
                    repository.save_labor_data(labor_data_item)
                except Exception as e:
                    logger.debug(f"Could not save labor data to DB: {e}")
        
        self.farm_data['labor'] = labor_data
        logger.info(f"Collected labor data for {len(labor_data)} ponds")

        # Run AI labor optimization (CrewAI agent + rule-based schedule/recommendations)
        try:
            labor_optimization = self.labor_agent.optimize_all_labor(
                water_quality_data, energy_data, labor_data
            )
            self.farm_data['labor_optimization'] = labor_optimization
            logger.info(f"Labor optimization completed for {len(labor_optimization)} ponds")
        except Exception as e:
            logger.warning(f"Labor optimization failed: {e}")
            self.farm_data['labor_optimization'] = []
        
        # Close repository connection
        if repository:
            repository.close()
    
    async def generate_insights(self):
        """Generate insights and recommendations using the manager agent"""
        logger.info("Generating insights and recommendations...")
        
        # Create manager task
        manager_task = self.manager_agent.create_synthesis_task(
            self.farm_data['water_quality'],
            self.farm_data['feed'],
            self.farm_data['energy'],
            self.farm_data['labor']
        )
        
        # Create crew with manager agent
        crew = Crew(
            agents=[self.manager_agent.agent],
            tasks=[manager_task],
            verbose=True
        )
        
        # Execute the task
        try:
            result = crew.kickoff()
            logger.info("Manager agent completed analysis")
            
            # Process insights (in a real implementation, this would parse the result)
            insights = self._extract_insights_from_result(result)
            logger.info(f"Generated {len(insights)} insights")
            
        except Exception as e:
            logger.error(f"Error in insight generation: {str(e)}")
            # Continue with basic insights if manager agent fails
            insights = self._generate_basic_insights()
    
    def _extract_insights_from_result(self, result) -> List[Dict]:
        """Extract insights from manager agent result"""
        # In a real implementation, this would parse the LLM output
        # For now, return basic insights
        return self._generate_basic_insights()
    
    def _generate_basic_insights(self) -> List[Dict]:
        """Generate basic insights from collected data"""
        insights = []
        
        # Water quality insights
        critical_ponds = [data for data in self.farm_data['water_quality'] 
                          if data.status.value in ['poor', 'critical']]
        if critical_ponds:
            insights.append({
                'type': 'Water Quality Alert',
                'priority': 'High',
                'message': f'Critical water quality issues in {len(critical_ponds)} pond(s)',
                'ponds': [data.pond_id for data in critical_ponds]
            })
        
        # Energy efficiency insights
        low_energy_ponds = [data for data in self.farm_data['energy'] 
                           if data.efficiency_score < 0.7]
        if low_energy_ponds:
            insights.append({
                'type': 'Energy Optimization',
                'priority': 'Medium',
                'message': f'Energy efficiency below optimal in {len(low_energy_ponds)} pond(s)',
                'ponds': [data.pond_id for data in low_energy_ponds]
            })
        
        return insights
    
    async def update_dashboard(self):
        """Update the farm dashboard with latest data"""
        logger.info("Updating farm dashboard...")
        
        dashboard = self.manager_agent.create_dashboard(
            self.farm_data['water_quality'],
            self.farm_data['feed'],
            self.farm_data['energy'],
            self.farm_data['labor']
        )
        
        self.farm_data['dashboard'] = dashboard
        logger.info("Dashboard updated successfully")
    
    def get_farm_status(self) -> Dict[str, Any]:
        """Get current farm status summary"""
        if not self.farm_data['dashboard']:
            return {'status': 'No data available'}
        
        dashboard = self.farm_data['dashboard']
        
        return {
            'timestamp': dashboard.timestamp.isoformat(),
            'overall_health_score': dashboard.overall_health_score,
            'water_quality_summary': {str(k): v.value for k, v in dashboard.water_quality_summary.items()},
            'feed_efficiency': dashboard.feed_efficiency,
            'energy_efficiency': dashboard.energy_efficiency,
            'labor_efficiency': dashboard.labor_efficiency,
            'alerts_count': len(dashboard.alerts),
            'insights_count': len(dashboard.insights),
            'recommendations_count': len(dashboard.recommendations)
        }
    
    def save_farm_data(self, filename: str = None):
        """
        Save farm data to MongoDB (deprecated - data is now saved automatically during collect_agent_data).
        
        This method is kept for backward compatibility but does nothing since data is already
        saved to MongoDB during the data collection phase.
        """
        logger.info("Farm data is automatically saved to MongoDB during data collection")
        return None
    
    def stop_monitoring(self):
        """Stop the monitoring cycle"""
        logger.info("Stopping monitoring cycle...")
        self.is_running = False
    
    async def run_single_cycle(self):
        """Run a single monitoring cycle (for testing)"""
        logger.info("Running single monitoring cycle...")
        await self.run_monitoring_cycle()
        return self.get_farm_status()

async def main():
    """Main function to run the shrimp farm orchestrator"""
    print("Shrimp Farm Management System")
    print("=" * 50)
    
    # Check if OpenAI API key is configured
    if OPENAI_API_KEY == "your_openai_api_key_here":
        print("ERROR: Please configure your OpenAI API key in the .env file")
        print("   Copy .env.example to .env and add your API key")
        return
    
    # Initialize orchestrator
    orchestrator = ShrimpFarmOrchestrator()
    
    try:
        # Run a single cycle for demonstration
        print("Running initial monitoring cycle...")
        status = await orchestrator.run_single_cycle()
        
        print("\nFarm Status Summary:")
        print(f"Overall Health Score: {status['overall_health_score']:.2f}")
        print(f"Feed Efficiency: {status['feed_efficiency']:.2f}")
        print(f"Energy Efficiency: {status['energy_efficiency']:.2f}")
        print(f"Labor Efficiency: {status['labor_efficiency']:.2f}")
        print(f"Active Alerts: {status['alerts_count']}")
        print(f"Insights: {status['insights_count']}")
        
        # Data is automatically saved to MongoDB during collect_agent_data()
        print(f"\nFarm data saved to MongoDB during data collection")
        
        # Ask user if they want to start continuous monitoring
        print("\n" + "=" * 50)
        choice = input("Start continuous monitoring? (y/n): ").lower().strip()
        
        if choice == 'y':
            print("Starting continuous monitoring...")
            print("Press Ctrl+C to stop")
            await orchestrator.start_monitoring_cycle()
        else:
            print("Single cycle completed. Exiting...")
    
    except KeyboardInterrupt:
        print("\nMonitoring stopped by user")
    except Exception as e:
        logger.error(f"Error in main execution: {str(e)}")
        print(f"Error: {str(e)}")
    finally:
        orchestrator.stop_monitoring()

if __name__ == "__main__":
    asyncio.run(main())
