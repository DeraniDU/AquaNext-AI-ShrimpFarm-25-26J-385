import { Bar, Line, Pie } from 'react-chartjs-2'
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	Tooltip,
	Legend,
	LineElement,
	PointElement,
	Filler,
	ArcElement,
} from 'chart.js'
import type { DashboardApiResponse, SavedFarmSnapshot } from '../lib/types'
import { formatDateTime } from '../lib/format'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Tooltip, Legend, ArcElement)

type Props = {
	data: DashboardApiResponse
	history: SavedFarmSnapshot[]
	pondFilter: number | null
	ponds?: number
	embedded?: boolean
}

function CircularProgress({ percentage, size = 120, strokeWidth = 12, color = '#10b981' }: { percentage: number; size?: number; strokeWidth?: number; color?: string }) {
	const radius = (size - strokeWidth) / 2
	const circumference = radius * 2 * Math.PI
	const offset = circumference - (percentage / 100) * circumference

	return (
		<div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
			<svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke="rgba(17, 24, 39, 0.05)"
					strokeWidth={strokeWidth}
					fill="none"
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke={color}
					strokeWidth={strokeWidth}
					fill="none"
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					strokeLinecap="round"
					style={{ transition: 'stroke-dashoffset 0.5s ease' }}
				/>
			</svg>
			<div style={{ textAlign: 'center', zIndex: 1 }}>
				<div style={{ fontSize: size * 0.22, fontWeight: 700, color: 'var(--text)' }}>{Math.round(percentage)}%</div>
				<div style={{ fontSize: size * 0.09, color: 'var(--muted)' }}>Efficiency</div>
			</div>
		</div>
	)
}

export function LaborOptimizationView({ data, history, pondFilter, ponds = 4, embedded = false }: Props) {
	const gridColor = 'rgba(17, 24, 39, 0.05)'
	const axisColor = 'rgba(17, 24, 39, 0.4)'

	const laborData = pondFilter ? data.labor.filter(l => l.pond_id === pondFilter) : data.labor
	const totalWorkers = laborData.reduce((sum, l) => sum + l.worker_count, 0)
	const avgEfficiency = laborData.length > 0 ? (laborData.reduce((sum, l) => sum + l.efficiency_score, 0) / laborData.length) * 100 : 0
	
	const totalTasksCompleted = laborData.reduce((sum, l) => sum + (l.tasks_completed?.length || 0), 0)
	const totalNextTasks = laborData.reduce((sum, l) => sum + (l.next_tasks?.length || 0), 0)
	const totalTasks = totalTasksCompleted + totalNextTasks
	const taskCompletionRate = totalTasks > 0 ? (totalTasksCompleted / totalTasks) * 100 : 0

	// Avg completion time
	const avgCompletionTime = 42 // placeholder or derive from metrics
	
	// Recommendations from real data
	const allRecommendations = data.labor_optimization?.flatMap(lo => 
		lo.recommendations.map(r => ({ ...r, pond_id: lo.pond_id }))
	) || []

	// Worker allocation by pond
	const workerAllocationData = laborData.map(l => {
		const pct = Math.min(100, (l.worker_count / (totalWorkers || 1)) * 100 * 2) // mock scaling for visualization
		let level = 'Low'
		let color = '#10b981' // Green
		if (l.worker_count >= 6) { level = 'High'; color = '#f59e0b' } // Orange
		else if (l.worker_count >= 4) { level = 'Medium'; color = '#0ea5e9' } // Blue

		let phase = 'Growth'
		if (l.pond_id % 3 === 0) phase = 'Maturation'
		else if (l.pond_id % 2 === 0) phase = 'Juvenile'

		return {
			id: `P${l.pond_id}`,
			pond_id: l.pond_id,
			name: phase,
			workers: l.worker_count,
			pct,
			level,
			color
		}
	}).sort((a, b) => a.pond_id - b.pond_id)

	// Combine all task assignments for 'Task Management' section
	const tasksList: any[] = []
	if (data.labor_optimization) {
		data.labor_optimization.forEach(lo => {
			if (lo.schedule?.morning_shift) {
				lo.schedule.morning_shift.tasks.forEach(task => {
					tasksList.push({ task, pond: `P${lo.pond_id}`, time: 'Morning', priority: 'High', color: '#f59e0b' })
				})
			}
			if (lo.schedule?.afternoon_shift) {
				lo.schedule.afternoon_shift.tasks.forEach(task => {
					tasksList.push({ task, pond: `P${lo.pond_id}`, time: 'Afternoon', priority: 'Medium', color: '#0ea5e9' })
				})
			}
		})
	}
	// Fallback to static if empty
	if (tasksList.length === 0) {
		tasksList.push(
			{ task: 'Pond Inspection', pond: 'P3', time: '45 min', priority: 'High', color: '#f59e0b' },
			{ task: 'Feed Distribution', pond: 'P2', time: '90 min', priority: 'High', color: '#f59e0b' },
			{ task: 'Aerator Maintenance', pond: 'P4', time: '60 min', priority: 'Medium', color: '#0ea5e9' },
			{ task: 'Water Quality Testing', pond: 'P1', time: '30 min', priority: 'High', color: '#f59e0b' }
		)
	}

	// Group tasks by category for Pie chart
	const taskDistributionMap: Record<string, number> = {}
	let totalDistTasks = 0
	laborData.forEach(l => {
		l.tasks_completed?.forEach(t => {
			let category = 'Other'
			if (t.toLowerCase().includes('feed')) category = 'Feed Distribution'
			else if (t.toLowerCase().includes('water') || t.toLowerCase().includes('quality') || t.toLowerCase().includes('test')) category = 'Water Testing'
			else if (t.toLowerCase().includes('clean')) category = 'Cleaning'
			else if (t.toLowerCase().includes('maintain') || t.toLowerCase().includes('aerator') || t.toLowerCase().includes('pump')) category = 'Maintenance'
			else if (t.toLowerCase().includes('inspect') || t.toLowerCase().includes('monitor')) category = 'Pond Inspection'
			
			taskDistributionMap[category] = (taskDistributionMap[category] || 0) + 1
			totalDistTasks++
		})
	})
	
	// Fallback data if empty
	if (totalDistTasks === 0) {
		taskDistributionMap['Pond Inspection'] = 30
		taskDistributionMap['Feed Distribution'] = 35
		taskDistributionMap['Maintenance'] = 15
		taskDistributionMap['Water Testing'] = 12
		taskDistributionMap['Cleaning'] = 8
        totalDistTasks = 100
	}

	const taskLabels = Object.keys(taskDistributionMap)
	const taskDataValues = Object.values(taskDistributionMap)

	const taskDistributionData = {
		labels: taskLabels,
		datasets: [
			{
				data: taskDataValues,
				backgroundColor: [
					'#3b82f6', // blue
					'#10b981', // emerald
					'#06b6d4', // cyan
					'#6366f1', // indigo
					'#8b5cf6', // violet
					'#f59e0b'  // orange
				],
				borderWidth: 0
			}
		]
	}

	// Labor Hours per pond chart
	const laborHoursData = {
		labels: workerAllocationData.map(w => w.id),
		datasets: [
			{
				label: 'Labor Hours (Time Spent)',
				data: laborData.map(l => l.time_spent),
				backgroundColor: '#22c55e',
				borderRadius: 4,
				maxBarThickness: 32
			}
		]
	}

	// Labor efficiency trend (from history)
	const recentHistory = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).slice(-7)
	const historyLabels = recentHistory.length > 0 
		? recentHistory.map(h => new Date(h.timestamp).toLocaleDateString(undefined, { weekday: 'short' }))
		: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
	
	const historyData = recentHistory.length > 0
		? recentHistory.map(h => {
			const filterLabor = pondFilter ? h.labor.filter(l => l.pond_id === pondFilter) : h.labor
			const avg = filterLabor.length > 0 ? (filterLabor.reduce((sum, l) => sum + l.efficiency_score, 0) / filterLabor.length) * 100 : 80
			return avg
		})
		: [75, 78, 82, 79, 85, 83, 87]

	const efficiencyTrendData = {
		labels: historyLabels,
		datasets: [
			{
				label: 'Efficiency %',
				data: historyData,
				borderColor: '#0ea5e9',
				backgroundColor: 'transparent',
				tension: 0.4,
				borderWidth: 2,
				pointBackgroundColor: '#0ea5e9',
				pointRadius: 4,
				pointHoverRadius: 6
			}
		]
	}

	return (
		<div style={{ padding: embedded ? '0' : '0 0 20px 0' }}>
			{!embedded && (
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
					<div>
						<h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text)' }}>Labor Optimization</h1>
						<div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>AI-Powered Shrimp Farm Management System</div>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
						<span style={{ fontSize: 14, color: 'var(--muted)' }}>Today</span>
						<span style={{ fontSize: 14, fontWeight: 600 }}>{formatDateTime(data.dashboard.timestamp).split(',')[0]}</span>
						<div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12 }}>AD</div>
					</div>
				</div>
			)}

			{/* Top Cards */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
				<div className="panel" style={{ padding: 20 }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
						<div>
							<div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Total Workers Assigned</div>
							<div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{totalWorkers}</div>
						</div>
						<div style={{ padding: 8, backgroundColor: '#e0f2fe', borderRadius: 8, color: '#0ea5e9' }}>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
						</div>
					</div>
					<div style={{ fontSize: 13, color: 'var(--muted)' }}>Active today</div>
				</div>

				<div className="panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
					<div style={{ fontSize: 13, color: 'var(--muted)', width: '100%', textAlign: 'left', marginBottom: 4 }}>Labor Efficiency Score</div>
					<CircularProgress percentage={avgEfficiency} size={80} strokeWidth={8} color={avgEfficiency >= 85 ? "#10b981" : "#f59e0b"} />
				</div>

				<div className="panel" style={{ padding: 20 }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
						<div>
							<div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Tasks Completed</div>
							<div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
								{totalTasksCompleted} <span style={{ fontSize: 20, color: 'var(--muted)' }}>/ {totalTasks}</span>
							</div>
						</div>
						<div style={{ padding: 8, backgroundColor: '#dcfce7', borderRadius: 8, color: '#10b981' }}>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
						</div>
					</div>
					<div style={{ fontSize: 13, color: 'var(--muted)' }}>{totalNextTasks} tasks pending</div>
					<div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{Math.round(taskCompletionRate)}% completion rate</div>
				</div>

				<div className="panel" style={{ padding: 20 }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
						<div>
							<div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Avg. Task Completion Time</div>
							<div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{avgCompletionTime} <span style={{ fontSize: 20, color: 'var(--muted)' }}>min</span></div>
						</div>
						<div style={{ padding: 8, backgroundColor: '#fef3c7', borderRadius: 8, color: '#d97706' }}>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
						</div>
					</div>
					<div style={{ fontSize: 13, color: 'var(--muted)' }}>Per task</div>
				</div>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24, marginBottom: 24 }}>
				{/* Left Column: Worker Allocation */}
				<div className="panel" style={{ padding: 20 }}>
					<h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px 0', color: 'var(--text)' }}>Worker Allocation by Pond</h3>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
						{workerAllocationData.map(pond => (
							<div key={pond.id}>
								<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
										<div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: pond.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>
											{pond.id}
										</div>
										<div>
											<div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Pond {pond.pond_id} - {pond.name}</div>
											<div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
												<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
												{pond.workers} workers assigned
											</div>
										</div>
									</div>
									<div style={{ fontSize: 12, fontWeight: 600, color: pond.color }}>{pond.level} Workload</div>
								</div>
								<div style={{ height: 6, backgroundColor: 'rgba(17, 24, 39, 0.05)', borderRadius: 3, overflow: 'hidden' }}>
									<div style={{ height: '100%', width: `${pond.pct}%`, backgroundColor: pond.color, borderRadius: 3 }}></div>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Right Column: AI Optimization Recommendations */}
				<div className="panel" style={{ padding: 20, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
					<h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px 0', color: 'var(--text)' }}>AI Optimization Recommendations</h3>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
						{allRecommendations.slice(0, 4).map((rec: any, i: number) => {
							const impactLevel = rec.priority === 'High' ? 'High' : 'Medium'
							const impactColor = impactLevel === 'High' ? '#f59e0b' : '#0ea5e9'
							const iconColor = impactLevel === 'High' ? '#10b981' : '#0ea5e9'
							return (
								<div key={i} style={{ backgroundColor: 'white', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', gap: 12 }}>
									<div style={{ color: iconColor, marginTop: 2 }}>
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
									</div>
									<div>
										<div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
											{rec.recommendation}
										</div>
										<div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
											Impact: <span style={{ color: impactColor, fontWeight: 600 }}>{impactLevel}</span>
										</div>
									</div>
								</div>
							)
						})}
						{allRecommendations.length === 0 && (
							<div style={{ fontSize: 13, color: 'var(--muted)', padding: '12px 0' }}>No labor optimizations recommended at this time.</div>
						)}
					</div>
				</div>
			</div>

			{/* Task Management */}
			<div className="panel" style={{ padding: 20, marginBottom: 24 }}>
				<h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px 0', color: 'var(--text)' }}>Task Management</h3>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					{tasksList.map((row, i) => (
						<div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid #f1f5f9', borderRadius: 8, backgroundColor: '#fafafa' }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
								<div style={{ color: 'var(--muted)' }}>
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
								</div>
								<div>
									<div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{row.task} - {row.pond}</div>
									<div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
										<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
											<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
											Shift: {row.time}
										</span>
									</div>
								</div>
							</div>
							<div style={{ fontSize: 12, fontWeight: 600, color: row.color }}>
								{row.priority} Priority
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Charts Row */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
				<div className="panel" style={{ padding: 20 }}>
					<h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px 0', color: 'var(--text)' }}>Labor Hours per Pond</h3>
					<div style={{ height: 250 }}>
						<Bar 
							data={laborHoursData} 
							options={{
								responsive: true,
								maintainAspectRatio: false,
								plugins: { legend: { display: true, position: 'bottom' } },
								scales: {
									y: { min: 0, grid: { color: gridColor }, ticks: { color: axisColor } },
									x: { grid: { display: false }, ticks: { color: axisColor } }
								}
							}} 
						/>
					</div>
				</div>

				<div className="panel" style={{ padding: 20 }}>
					<h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px 0', color: 'var(--text)' }}>Task Distribution</h3>
					<div style={{ height: 250, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
						<div style={{ width: '50%', height: '100%', position: 'relative' }}>
							<Pie 
								data={taskDistributionData} 
								options={{
									responsive: true,
									maintainAspectRatio: false,
									plugins: {
										legend: { display: false },
									}
								}} 
							/>
						</div>
						{/* Custom legend */}
						<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, marginLeft: 20, flex: 1 }}>
							{taskDistributionData.labels.map((label, i) => {
								const percentage = totalDistTasks > 0 ? Math.round((taskDistributionData.datasets[0].data[i] / totalDistTasks) * 100) : taskDistributionData.datasets[0].data[i]
								return (
									<div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text)' }}>
										<div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: taskDistributionData.datasets[0].backgroundColor[i] }}></div>
										<span style={{ flex: 1 }}>{label}</span>
										<span style={{ fontWeight: 600 }}>{percentage}%</span>
									</div>
								)
							})}
						</div>
					</div>
				</div>
			</div>

			{/* Bottom Chart */}
			<div className="panel" style={{ padding: 20 }}>
				<h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px 0', color: 'var(--text)' }}>Labor Efficiency Trend</h3>
				<div style={{ height: 200 }}>
					<Line 
						data={efficiencyTrendData} 
						options={{
							responsive: true,
							maintainAspectRatio: false,
							plugins: { legend: { display: true, position: 'bottom' } },
							scales: {
								y: { min: 0, max: 100, grid: { color: gridColor }, ticks: { color: axisColor } },
								x: { grid: { display: false }, ticks: { color: axisColor } }
							}
						}} 
					/>
				</div>
			</div>
		</div>
	)
}
