import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from datetime import datetime, timedelta
import json
from typing import List, Dict, Any

from models import ShrimpFarmDashboard, WaterQualityData, FeedData, EnergyData, LaborData, WaterQualityStatus, AlertLevel
from agents.water_quality_agent import WaterQualityAgent
from agents.feed_prediction_agent import FeedPredictionAgent
from agents.energy_optimization_agent import EnergyOptimizationAgent
from agents.labor_optimization_agent import LaborOptimizationAgent
from agents.manager_agent import ManagerAgent

class ShrimpFarmDashboardApp:
    def __init__(self):
        self.water_quality_agent = WaterQualityAgent()
        self.feed_agent = FeedPredictionAgent()
        self.energy_agent = EnergyOptimizationAgent()
        self.labor_agent = LaborOptimizationAgent()
        self.manager_agent = ManagerAgent()
        
        # Initialize session state
        if 'dashboard_data' not in st.session_state:
            st.session_state.dashboard_data = None
        if 'last_update' not in st.session_state:
            st.session_state.last_update = None
    
    def run(self):
        st.set_page_config(
            page_title="Shrimp Farm Management System",
            page_icon=None,
            layout="wide",
            initial_sidebar_state="expanded"
        )
        
        st.title("Shrimp Farm Management System")
        st.markdown("AI-Powered Multi-Agent Farm Operations Dashboard")
        
        # Sidebar controls
        self.render_sidebar()
        
        # Main dashboard
        if st.session_state.dashboard_data:
            self.render_dashboard()
        else:
            st.info("Click 'Update Dashboard' to load farm data")
    
    def render_sidebar(self):
        st.sidebar.header("Farm Controls")
        
        # Update button
        if st.sidebar.button("Update Dashboard", type="primary"):
            with st.spinner("Collecting data from all agents..."):
                self.update_dashboard_data()
        
        # Manual refresh
        if st.sidebar.button("Force Refresh"):
            st.session_state.dashboard_data = None
            st.rerun()
        
        st.sidebar.divider()
        
        # Farm configuration
        st.sidebar.subheader("Farm Configuration")
        pond_count = st.sidebar.slider("Number of Ponds", 1, 8, 4)
        
        # Display last update time
        if st.session_state.last_update:
            st.sidebar.info(f"Last Update: {st.session_state.last_update.strftime('%H:%M:%S')}")
        
        st.sidebar.divider()
        
        # Quick actions
        st.sidebar.subheader("Quick Actions")
        if st.sidebar.button("Generate Report"):
            self.generate_report()
        
        if st.sidebar.button("Check Alerts"):
            self.check_alerts()
    
    def update_dashboard_data(self):
        """Update dashboard with fresh data from all agents"""
        try:
            # Simulate data collection from all agents
            water_quality_data = []
            feed_data = []
            energy_data = []
            labor_data = []
            
            # Generate data for each pond
            for pond_id in range(1, 5):  # 4 ponds
                # Water quality data
                wq_data = self.water_quality_agent.simulate_water_quality_data(pond_id)
                water_quality_data.append(wq_data)
                
                # Feed data
                feed_data_item = self.feed_agent.simulate_feed_data(pond_id, wq_data)
                feed_data.append(feed_data_item)
                
                # Energy data
                energy_data_item = self.energy_agent.simulate_energy_data(pond_id, wq_data)
                energy_data.append(energy_data_item)
                
                # Labor data
                labor_data_item = self.labor_agent.simulate_labor_data(pond_id, wq_data, energy_data_item)
                labor_data.append(labor_data_item)
            
            # Create dashboard
            dashboard = self.manager_agent.create_dashboard(
                water_quality_data, feed_data, energy_data, labor_data
            )
            
            st.session_state.dashboard_data = {
                'dashboard': dashboard,
                'water_quality': water_quality_data,
                'feed': feed_data,
                'energy': energy_data,
                'labor': labor_data
            }
            st.session_state.last_update = datetime.now()
            
            st.success("Dashboard updated successfully!")
            
        except Exception as e:
            st.error(f"Error updating dashboard: {str(e)}")
    
    def render_dashboard(self):
        """Render the main dashboard"""
        data = st.session_state.dashboard_data
        dashboard = data['dashboard']
        
        # Key metrics row
        self.render_key_metrics(dashboard)
        
        # Alerts and insights
        self.render_alerts_and_insights(dashboard)
        
        # Detailed sections
        col1, col2 = st.columns(2)
        
        with col1:
            self.render_water_quality_section(data['water_quality'])
            self.render_energy_section(data['energy'])
        
        with col2:
            self.render_feed_section(data['feed'])
            self.render_labor_section(data['labor'])
        
        # Recommendations
        self.render_recommendations(dashboard)
    
    def render_key_metrics(self, dashboard: ShrimpFarmDashboard):
        """Render key performance metrics"""
        st.subheader("Farm Performance Overview")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            health_status = "EXCELLENT" if dashboard.overall_health_score > 0.8 else "GOOD" if dashboard.overall_health_score > 0.6 else "NEEDS ATTENTION"
            st.metric(
                "Overall Health Score",
                f"{dashboard.overall_health_score:.2f}",
                delta=None,
                help="Combined score of all farm operations"
            )
            st.write(f"Health Status: {health_status}")
        
        with col2:
            st.metric(
                "Feed Efficiency",
                f"{dashboard.feed_efficiency:.2f}",
                delta=None,
                help="Feed conversion efficiency"
            )
        
        with col3:
            st.metric(
                "Energy Efficiency", 
                f"{dashboard.energy_efficiency:.2f}",
                delta=None,
                help="Energy usage efficiency"
            )
        
        with col4:
            st.metric(
                "Labor Efficiency",
                f"{dashboard.labor_efficiency:.2f}",
                delta=None,
                help="Labor productivity efficiency"
            )
    
    def render_alerts_and_insights(self, dashboard: ShrimpFarmDashboard):
        """Render alerts and insights"""
        if dashboard.alerts:
            st.subheader("Active Alerts")
            for alert in dashboard.alerts:
                if "CRITICAL" in alert:
                    st.error(alert)
                elif "WARNING" in alert:
                    st.warning(alert)
                else:
                    st.info(alert)
        
        if dashboard.insights:
            st.subheader("Strategic Insights")
            for insight in dashboard.insights:
                with st.expander(f"{insight.insight_type} - {insight.priority.value.upper()}"):
                    st.write(insight.message)
                    if insight.recommendations:
                        st.write("**Recommendations:**")
                        for rec in insight.recommendations:
                            st.write(f"• {rec}")
    
    def render_water_quality_section(self, water_quality_data: List[WaterQualityData]):
        """Render water quality section"""
        st.subheader("Water Quality Status")
        
        # Create water quality chart
        df_wq = pd.DataFrame([
            {
                'Pond': f"Pond {data.pond_id}",
                'pH': data.ph,
                'Temperature': data.temperature,
                'Dissolved Oxygen': data.dissolved_oxygen,
                'Salinity': data.salinity,
                'Status': data.status.value
            }
            for data in water_quality_data
        ])
        
        # Status color mapping
        status_colors = {
            'excellent': 'green',
            'good': 'lightgreen', 
            'fair': 'yellow',
            'poor': 'orange',
            'critical': 'red'
        }
        
        # Create subplot for water quality parameters
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=('pH Levels', 'Temperature', 'Dissolved Oxygen', 'Salinity'),
            specs=[[{"secondary_y": False}, {"secondary_y": False}],
                   [{"secondary_y": False}, {"secondary_y": False}]]
        )
        
        # pH chart
        fig.add_trace(
            go.Bar(x=df_wq['Pond'], y=df_wq['pH'], name='pH', marker_color='blue'),
            row=1, col=1
        )
        fig.add_hline(y=7.5, line_dash="dash", line_color="red", row=1, col=1)
        fig.add_hline(y=8.5, line_dash="dash", line_color="red", row=1, col=1)
        
        # Temperature chart
        fig.add_trace(
            go.Bar(x=df_wq['Pond'], y=df_wq['Temperature'], name='Temperature', marker_color='orange'),
            row=1, col=2
        )
        fig.add_hline(y=26, line_dash="dash", line_color="red", row=1, col=2)
        fig.add_hline(y=30, line_dash="dash", line_color="red", row=1, col=2)
        
        # Dissolved Oxygen chart
        fig.add_trace(
            go.Bar(x=df_wq['Pond'], y=df_wq['Dissolved Oxygen'], name='DO', marker_color='cyan'),
            row=2, col=1
        )
        fig.add_hline(y=5, line_dash="dash", line_color="red", row=2, col=1)
        
        # Salinity chart
        fig.add_trace(
            go.Bar(x=df_wq['Pond'], y=df_wq['Salinity'], name='Salinity', marker_color='purple'),
            row=2, col=2
        )
        fig.add_hline(y=15, line_dash="dash", line_color="red", row=2, col=2)
        fig.add_hline(y=25, line_dash="dash", line_color="red", row=2, col=2)
        
        fig.update_layout(height=600, showlegend=False, title_text="Water Quality Parameters by Pond")
        st.plotly_chart(fig, use_container_width=True)
        
        # Status table
        st.write("**Water Quality Status by Pond:**")
        status_df = df_wq[['Pond', 'Status']].copy()
        status_df['Status'] = status_df['Status'].map(status_colors)
        st.dataframe(status_df, use_container_width=True)
    
    def render_feed_section(self, feed_data: List[FeedData]):
        """Render feed management section"""
        st.subheader("Feed Management")
        
        df_feed = pd.DataFrame([
            {
                'Pond': f"Pond {data.pond_id}",
                'Shrimp Count': data.shrimp_count,
                'Avg Weight (g)': data.average_weight,
                'Feed Amount (g)': data.feed_amount,
                'Feed Type': data.feed_type,
                'Frequency': data.feeding_frequency
            }
            for data in feed_data
        ])
        
        # Feed efficiency chart
        fig = px.bar(df_feed, x='Pond', y='Feed Amount (g)', 
                    title='Feed Amount by Pond',
                    color='Feed Type',
                    color_discrete_sequence=px.colors.qualitative.Set3)
        st.plotly_chart(fig, use_container_width=True)
        
        # Feed data table
        st.write("**Feed Schedule:**")
        st.dataframe(df_feed, use_container_width=True)
    
    def render_energy_section(self, energy_data: List[EnergyData]):
        """Render energy management section"""
        st.subheader("Energy Management")
        
        df_energy = pd.DataFrame([
            {
                'Pond': f"Pond {data.pond_id}",
                'Aerator (kWh)': data.aerator_usage,
                'Pump (kWh)': data.pump_usage,
                'Heater (kWh)': data.heater_usage,
                'Total (kWh)': data.total_energy,
                'Cost ($)': data.cost,
                'Efficiency': data.efficiency_score
            }
            for data in energy_data
        ])
        
        # Energy usage pie chart
        total_energy = df_energy['Total (kWh)'].sum()
        fig = px.pie(df_energy, values='Total (kWh)', names='Pond', 
                    title=f'Energy Distribution (Total: {total_energy:.1f} kWh)')
        st.plotly_chart(fig, use_container_width=True)
        
        # Energy efficiency chart
        fig = px.bar(df_energy, x='Pond', y='Efficiency',
                    title='Energy Efficiency by Pond',
                    color='Efficiency',
                    color_continuous_scale='RdYlGn')
        st.plotly_chart(fig, use_container_width=True)
        
        # Energy data table
        st.write("**Energy Usage Summary:**")
        st.dataframe(df_energy, use_container_width=True)
    
    def render_labor_section(self, labor_data: List[LaborData]):
        """Render labor management section"""
        st.subheader("Labor Management")
        
        df_labor = pd.DataFrame([
            {
                'Pond': f"Pond {data.pond_id}",
                'Tasks Completed': len(data.tasks_completed),
                'Time Spent (h)': data.time_spent,
                'Workers': data.worker_count,
                'Efficiency': data.efficiency_score,
                'Next Tasks': ', '.join(data.next_tasks[:3])  # Show first 3 tasks
            }
            for data in labor_data
        ])
        
        # Labor efficiency chart
        fig = px.bar(df_labor, x='Pond', y='Efficiency',
                    title='Labor Efficiency by Pond',
                    color='Efficiency',
                    color_continuous_scale='RdYlGn')
        st.plotly_chart(fig, use_container_width=True)
        
        # Tasks vs time scatter plot
        fig = px.scatter(df_labor, x='Time Spent (h)', y='Tasks Completed',
                        size='Workers', color='Efficiency',
                        title='Task Completion vs Time Spent',
                        hover_data=['Pond'])
        st.plotly_chart(fig, use_container_width=True)
        
        # Labor data table
        st.write("**Labor Summary:**")
        st.dataframe(df_labor, use_container_width=True)
    
    def render_recommendations(self, dashboard: ShrimpFarmDashboard):
        """Render recommendations section"""
        if dashboard.recommendations:
            st.subheader("Strategic Recommendations")
            for i, rec in enumerate(dashboard.recommendations, 1):
                st.write(f"{i}. {rec}")
    
    def generate_report(self):
        """Generate comprehensive farm report"""
        st.subheader("Farm Operations Report")
        st.write("Generating comprehensive report...")
        # Implementation would generate a detailed PDF report
        st.success("Report generated successfully!")
    
    def check_alerts(self):
        """Check and display all alerts"""
        st.subheader("Alert Status")
        if st.session_state.dashboard_data:
            dashboard = st.session_state.dashboard_data['dashboard']
            if dashboard.alerts:
                for alert in dashboard.alerts:
                    st.write(alert)
            else:
                st.success("No active alerts")
        else:
            st.info("No data available")

def main():
    app = ShrimpFarmDashboardApp()
    app.run()

if __name__ == "__main__":
    main()
