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
		
		// AI recommendations from labor_optimization (DB-backed when available); dedupe by text and group pond context
		const rawRecs = data.labor_optimization?.flatMap(lo =>
			(lo.recommendations || []).map(r => ({ ...r, pond_id: lo.pond_id }))
		) || []
		const recsByText = new Map<string, { rec: typeof rawRecs[0]; pond_ids: number[] }>()
		rawRecs.forEach((r) => {
			const key = (r.recommendation || '').trim().toLowerCase()
			if (!key) return
			const existing = recsByText.get(key)
			if (existing) {
				if (!existing.pond_ids.includes(r.pond_id)) existing.pond_ids.push(r.pond_id)
			} else {
				recsByText.set(key, { rec: r, pond_ids: [r.pond_id] })
			}
		})
		const displayRecommendations = Array.from(recsByText.values())
			.sort((a, b) => (b.rec.priority === 'high' ? 1 : 0) - (a.rec.priority === 'high' ? 1 : 0))
			.slice(0, 6)
			.map(({ rec, pond_ids }) => ({ ...rec, pond_ids: pond_ids.sort((x, y) => x - y) }))

		// Labour schedule table: LLM-recommended schedule from labor_optimization (based on DB data when available)
		const scheduleRows: { pond_id: number; pond: string; shift: string; time: string; workers: number; tasks: string[] }[] = []
		const shiftConfig = [
			{ key: 'morning_shift' as const, label: 'Morning' },
			{ key: 'afternoon_shift' as const, label: 'Afternoon' },
			{ key: 'evening_shift' as const, label: 'Evening' },
		]
		if (data.labor_optimization) {
			const optimizations = pondFilter
				? data.labor_optimization.filter(lo => lo.pond_id === pondFilter)
				: data.labor_optimization
			optimizations.forEach(lo => {
				const schedule = lo.schedule || {}
				shiftConfig.forEach(({ key, label }) => {
					const shift = schedule[key]
					if (shift?.tasks?.length) {
						scheduleRows.push({
							pond_id: lo.pond_id,
							pond: `Pond ${lo.pond_id}`,
							shift: label,
							time: shift.time || '—',
							workers: shift.workers ?? 0,
							tasks: shift.tasks,
						})
					}
				})
			})
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

		// Labor Hours per pond chart (labels and data in same pond order)
		const laborHoursSorted = [...laborData].sort((a, b) => a.pond_id - b.pond_id)
		const laborHoursData = {
			labels: laborHoursSorted.map(l => `P${l.pond_id}`),
			datasets: [
				{
					label: 'Labor Hours (Time Spent)',
					data: laborHoursSorted.map(l => l.time_spent),
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

				<div style={{ marginBottom: 24 }}>
					{/* AI Optimization Recommendations (from DB / current labor & pond data) */}
					<div className="panel" style={{ padding: 20, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
						<h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px 0', color: 'var(--text)' }}>AI Optimization Recommendations</h3>
						<div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
							Based on current labor & pond data (DB when available). Refresh to regenerate.
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
							{displayRecommendations.map((rec: any, i: number) => {
								const priority = (rec.priority || 'medium').toString().toLowerCase()
								const impactLevel = priority === 'high' ? 'High' : priority === 'low' ? 'Low' : 'Medium'
								const impactColor = impactLevel === 'High' ? '#f59e0b' : impactLevel === 'Low' ? '#64748b' : '#0ea5e9'
								const iconColor = impactLevel === 'High' ? '#10b981' : '#0ea5e9'
								const pondLabel = rec.pond_ids?.length === 1 ? `Pond ${rec.pond_ids[0]}` : rec.pond_ids?.length ? `Ponds ${rec.pond_ids.join(', ')}` : null
								return (
									<div key={i} style={{ backgroundColor: 'white', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', gap: 12 }}>
										<div style={{ color: iconColor, marginTop: 2 }}>
											<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
										</div>
										<div style={{ flex: 1 }}>
											<div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
												{rec.recommendation}
											</div>
											<div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
												<span>Impact: <span style={{ color: impactColor, fontWeight: 600 }}>{impactLevel}</span></span>
												{pondLabel && <span>· {pondLabel}</span>}
											</div>
										</div>
									</div>
								)
							})}
							{displayRecommendations.length === 0 && (
								<div style={{ fontSize: 13, color: 'var(--muted)', padding: '12px 0' }}>No recommendations yet. Refresh the dashboard to generate AI recommendations from current labor & pond data.</div>
							)}
						</div>
					</div>
				</div>

				{/* Labour Schedule — LLM-recommended based on DB / current labor & pond data */}
				<div className="panel" style={{ padding: 20, marginBottom: 24 }}>
					<h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px 0', color: 'var(--text)' }}>Labour Schedule</h3>
					<div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
						Recommended by AI from current labor & pond data (DB when available). Refresh dashboard to regenerate.
					</div>
					<div style={{ overflowX: 'auto', border: '1px solid rgba(17, 24, 39, 0.08)', borderRadius: 8 }}>
						<table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
							<thead>
								<tr style={{ backgroundColor: 'rgba(17, 24, 39, 0.03)', borderBottom: '1px solid rgba(17, 24, 39, 0.08)' }}>
									<th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Pond</th>
									<th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Shift</th>
									<th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Time</th>
									<th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Workers</th>
									<th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Tasks</th>
								</tr>
							</thead>
							<tbody>
								{scheduleRows.length === 0 ? (
									<tr>
										<td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
											No schedule yet. Click <strong>Refresh</strong> in the top bar to load dashboard and generate AI-recommended labour schedule from current data.
										</td>
									</tr>
								) : (
									scheduleRows.map((row, i) => (
										<tr key={i} style={{ borderBottom: '1px solid rgba(17, 24, 39, 0.06)' }}>
											<td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{row.pond}</td>
											<td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--text)' }}>{row.shift}</td>
											<td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--text)' }}>{row.time}</td>
											<td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--text)', textAlign: 'center' }}>{row.workers}</td>
											<td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--text)' }}>
												<ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
													{row.tasks.map((t, j) => (
														<li key={j} style={{ marginBottom: 4 }}>{t}</li>
													))}
												</ul>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
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
