import { Bar, Line } from 'react-chartjs-2'
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
 		RadialLinearScale,
	type ChartOptions
} from 'chart.js'
import { useState, useMemo } from 'react'
import type { DashboardApiResponse, SavedFarmSnapshot, FeedingPlan } from '../lib/types'
import { formatNumber, formatDateTime } from '../lib/format'
import { useFeedingOptimization } from '../lib/useFeedingOptimization'
import { LaborOptimizationView } from './LaborOptimizationView'
import { FeedOptimizationView } from './FeedOptimizationView'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Tooltip, Legend, RadialLinearScale)

type Props = {
	data: DashboardApiResponse
	history: SavedFarmSnapshot[]
	pondFilter: number | null
	ponds?: number
}

// Circular Progress Component
function CircularProgress({ percentage, size = 120, strokeWidth = 12, color = '#16a34a' }: { percentage: number; size?: number; strokeWidth?: number; color?: string }) {
	const radius = (size - strokeWidth) / 2
	const circumference = radius * 2 * Math.PI
	const offset = circumference - (percentage / 100) * circumference

	return (
		<div style={{ position: 'relative', width: size, height: size }}>
			<svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke="rgba(17, 24, 39, 0.1)"
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
			<div
				style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
					textAlign: 'center'
				}}
			>
				<div style={{ fontSize: size * 0.2, fontWeight: 700, color: color }}>{Math.round(percentage)}%</div>
			</div>
		</div>
	)
}

// Octagonal Progress Component
function OctagonalProgress({ percentage, size = 120, color = '#16a34a' }: { percentage: number; size?: number; color?: string }) {
	const radius = size / 2 - 10
	const centerX = size / 2
	const centerY = size / 2
	const sides = 8
	const angleStep = (2 * Math.PI) / sides
	const points: string[] = []

	for (let i = 0; i < sides; i++) {
		const angle = i * angleStep - Math.PI / 2
		const x = centerX + radius * Math.cos(angle)
		const y = centerY + radius * Math.sin(angle)
		points.push(`${x},${y}`)
	}

	const progressPoints = points.map((p, i) => {
		if (i < (percentage / 100) * sides) return p
		return `${centerX},${centerY}`
	})

	return (
		<div style={{ position: 'relative', width: size, height: size }}>
			<svg width={size} height={size}>
				<polygon points={points.join(' ')} fill="rgba(17, 24, 39, 0.05)" stroke="rgba(17, 24, 39, 0.1)" strokeWidth="2" />
				<polygon points={progressPoints.join(' ')} fill={color} fillOpacity={0.2} stroke={color} strokeWidth="3" />
			</svg>
			<div
				style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
					textAlign: 'center'
				}}
			>
				<div style={{ fontSize: size * 0.2, fontWeight: 700, color: color }}>{Math.round(percentage)}%</div>
			</div>
		</div>
	)
}

export function OptimizationView({ data, history, pondFilter, ponds = 4 }: Props) {
	const { dashboard } = data
	const water = pondFilter ? data.water_quality.filter((w) => w.pond_id === pondFilter) : data.water_quality
	const feed = pondFilter ? data.feed.filter((f) => f.pond_id === pondFilter) : data.feed
	const energy = pondFilter ? data.energy.filter((e) => e.pond_id === pondFilter) : data.energy
	const labor = pondFilter ? data.labor.filter((l) => l.pond_id === pondFilter) : data.labor
	const laborOptimization = data.labor_optimization
		? (pondFilter
			? data.labor_optimization.filter((o) => o.pond_id === pondFilter)
			: data.labor_optimization)
		: []
	const primaryLaborOpt = laborOptimization.length > 0 ? laborOptimization[0] : null

	const workerNames = ['Eric', 'Sarah', 'Alex', 'Ryan', 'Luis']

	const buildShiftAssignments = (tasks: string[] | undefined, workers: number | undefined) => {
		const assignments = Array(workerNames.length).fill('-')
		if (!tasks || tasks.length === 0) {
			return assignments
		}
		const nWorkers =
			workers && workers > 0 ? Math.min(workerNames.length, workers) : workerNames.length
		for (let i = 0; i < nWorkers; i++) {
			assignments[i] = tasks[i % tasks.length]
		}
		return assignments
	}

	const morningAssignments = primaryLaborOpt?.schedule
		? buildShiftAssignments(
				primaryLaborOpt.schedule.morning_shift?.tasks,
				primaryLaborOpt.schedule.morning_shift?.workers,
		  )
		: Array(workerNames.length).fill('-')
	const afternoonAssignments = primaryLaborOpt?.schedule
		? buildShiftAssignments(
				primaryLaborOpt.schedule.afternoon_shift?.tasks,
				primaryLaborOpt.schedule.afternoon_shift?.workers,
		  )
		: Array(workerNames.length).fill('-')
	const eveningAssignments = primaryLaborOpt?.schedule
		? buildShiftAssignments(
				primaryLaborOpt.schedule.evening_shift?.tasks,
				primaryLaborOpt.schedule.evening_shift?.workers,
		  )
		: Array(workerNames.length).fill('-')

	// Feeding optimization from backend — pass dashboard so POST uses water_quality + feed (LLM + DB)
	const { data: feedingOpt, loading: feedingLoading, error: feedingError, refresh: refreshFeeding } =
		useFeedingOptimization(ponds, data)
	// Filter to selected pond if a pond filter is active
	const feedingPlans: FeedingPlan[] = feedingOpt
		? pondFilter
			? feedingOpt.plans.filter((p) => p.pond_id === pondFilter)
			: feedingOpt.plans
		: []
	// Primary plan used for single-pond charts (first plan, or best plan by adjustment)
	const primaryPlan = feedingPlans.length > 0
		? feedingPlans.reduce((a, b) => a.adjustment_factor < b.adjustment_factor ? a : b)
		: null

	// State for interactive elements
	const [costWeight, setCostWeight] = useState(40)
	const [yieldWeight, setYieldWeight] = useState(40)
	const [riskWeight, setRiskWeight] = useState(20)
	const [showExplain, setShowExplain] = useState<number | null>(null)
	const [simulationFeed, setSimulationFeed] = useState(0)
	const [simulationAeration, setSimulationAeration] = useState(0)
	const [simulationHarvestDelay, setSimulationHarvestDelay] = useState(0)

	const totalEnergyCost = energy.reduce((sum, e) => sum + e.cost, 0)
	// `feed_amount` is per-feeding; daily feed = amount * frequency
	const totalFeedKg = feed.reduce((sum, f) => sum + f.feed_amount * (Number.isFinite(f.feeding_frequency) ? f.feeding_frequency : 1), 0) / 1000
	const feedCostPerKg = 400 // LKR per kg
	const totalFeedCost = totalFeedKg * feedCostPerKg
	const totalLaborCost = labor.reduce((sum, l) => sum + l.time_spent * 500, 0) // Rs. 500/hour estimate

	// Calculate metrics
	const avgWeight = feed.reduce((sum, f) => sum + f.average_weight, 0) / feed.length || 0
	const totalBiomass = feed.reduce((sum, f) => sum + (f.shrimp_count * f.average_weight) / 1000, 0) // kg
	const projectedYieldTons = totalBiomass / 1000
	const shrimpPricePerKg = 2000 // LKR per kg
	const projectedProfit = projectedYieldTons * 1000 * shrimpPricePerKg - (totalFeedCost + totalEnergyCost + totalLaborCost) * 30

	const fcr = totalFeedKg > 0 && totalBiomass > 0 ? totalFeedKg / totalBiomass : 1.2
	const avgFeedAmount = feed.reduce((sum, f) => sum + f.feed_amount, 0) / feed.length || 0
	const recommendedFeedRate = avgFeedAmount * 1.15 // 15% increase

	// Water quality averages
	const avgPh = water.reduce((sum, w) => sum + w.ph, 0) / water.length || 7.5
	const avgSalinity = water.reduce((sum, w) => sum + w.salinity, 0) / water.length || 25
	const avgOxygen = water.reduce((sum, w) => sum + w.dissolved_oxygen, 0) / water.length || 6.5
	const avgTemp = water.reduce((sum, w) => sum + w.temperature, 0) / water.length || 28

	// Energy breakdown
	const totalEnergyKwh = energy.reduce((sum, e) => sum + e.total_energy, 0)
	const aeratorEnergy = totalEnergyKwh * 0.3
	const pumpEnergy = totalEnergyKwh * 0.25
	const feederEnergy = totalEnergyKwh * 0.45

	// Calculate feed efficiency with fallback if missing or 0
	const calculateFeedEfficiency = () => {
		// First check if dashboard has a valid feed_efficiency value (must be > 0, not just != null)
		if (typeof dashboard.feed_efficiency === 'number' && dashboard.feed_efficiency > 0) {
			return dashboard.feed_efficiency
		}
		// Fallback calculation using already calculated FCR
		if (!feed.length) {
			return 0.8
		}
		// Use the FCR already calculated above (which handles units correctly)
		// FCR is typically 1.0-3.0 for shrimp farming
		// Optimal FCR is around 1.5-2.0, so efficiency decreases as FCR increases
		if (fcr > 0 && fcr < 10 && totalFeedKg > 0 && totalBiomass > 0) {
			// Convert FCR to efficiency: efficiency = 1.0 when FCR = 1.5, decreases as FCR increases
			const efficiency = Math.max(0.0, Math.min(1.0, 1.0 - (fcr - 1.5) / 2.0))
			// Ensure minimum efficiency of 0.2 (20%) even for poor FCR
			return Math.max(0.2, efficiency)
		}
		// Default fallback if calculations are invalid
		return 0.8
	}

	const feedEfficiency = calculateFeedEfficiency()
	const energyEfficiency = dashboard.energy_efficiency ?? 0.8
	const laborEfficiency = dashboard.labor_efficiency ?? 0.8

	// Optimization percentages
	const feedOptimized = feedEfficiency * 100
	const waterQualityOptimized = (avgPh > 7.5 && avgPh < 8.5 && avgOxygen > 6 && avgSalinity > 20 && avgSalinity < 30) ? 94 : 85
	const energyEfficient = energyEfficiency * 100

	// Calculate harvest timing recommendations
	const targetHarvestWeight = 25 // grams - typical harvest weight
	const growthRatePerDay = 0.15 // grams per day (estimated)
	const daysToOptimalWeight = avgWeight > 0 && avgWeight < targetHarvestWeight 
		? Math.ceil((targetHarvestWeight - avgWeight) / growthRatePerDay)
		: 0
	
	// Find best pond for harvest (highest weight and good conditions)
	const pondData = feed.map((f, idx) => ({
		pondId: f.pond_id,
		weight: f.average_weight,
		biomass: (f.shrimp_count * f.average_weight) / 1000,
		waterQuality: water.find(w => w.pond_id === f.pond_id),
		daysToHarvest: f.average_weight > 0 && f.average_weight < targetHarvestWeight
			? Math.ceil((targetHarvestWeight - f.average_weight) / growthRatePerDay)
			: 0
	}))
	
	const bestHarvestPond = pondData
		.filter(p => p.daysToHarvest > 0 && p.daysToHarvest <= 30)
		.sort((a, b) => {
			// Prioritize by: close to harvest, good water quality, high biomass
			const aScore = (30 - a.daysToHarvest) * 2 + (a.waterQuality?.status === 'excellent' || a.waterQuality?.status === 'good' ? 10 : 0) + a.biomass
			const bScore = (30 - b.daysToHarvest) * 2 + (b.waterQuality?.status === 'excellent' || b.waterQuality?.status === 'good' ? 10 : 0) + b.biomass
			return bScore - aScore
		})[0]

	// Energy optimization recommendations
	const peakHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] // 8 AM - 8 PM
	const offPeakHours = [0, 1, 2, 3, 4, 5, 6, 7, 21, 22, 23] // Night hours
	const currentPeakUsage = totalEnergyKwh * 0.6 // Assume 60% during peak
	const potentialSavings = currentPeakUsage * 0.15 // 15% savings by shifting to off-peak

	// Labor allocation recommendations
	const pondIds = Array.from(new Set(water.map((w) => w.pond_id))).sort()
	const urgentPonds = pondData
		.filter(p => p.waterQuality && (p.waterQuality.status === 'poor' || p.waterQuality.status === 'critical'))
		.map(p => p.pondId)
	
	// Labor calculations
	const totalLaborHours = labor.reduce((sum, l) => sum + l.time_spent, 0)
	const avgLaborHours = labor.length > 0 ? totalLaborHours / labor.length : 0
	const totalWorkers = labor.reduce((sum, l) => sum + l.worker_count, 0)
	const avgWorkersPerPond = labor.length > 0 ? totalWorkers / labor.length : 1
	const totalTasksCompleted = labor.reduce((sum, l) => sum + l.tasks_completed.length, 0)
	const avgTasksPerHour = totalLaborHours > 0 ? totalTasksCompleted / totalLaborHours : 0
	const avgTasksPerWorker = totalWorkers > 0 ? totalTasksCompleted / totalWorkers : 0
	const laborEfficiencyPercent = laborEfficiency * 100
	const hourlyWage = 500 // LKR per hour
	const laborCostPerTask = totalTasksCompleted > 0 ? totalLaborCost / totalTasksCompleted : 0
	const avgEfficiencyScore = labor.length > 0 ? labor.reduce((sum, l) => sum + l.efficiency_score, 0) / labor.length : 0.85
	
	// Task breakdown by type
	const allTasks = labor.flatMap(l => l.tasks_completed)
	const waterQualityTasks = allTasks.filter(t => t.toLowerCase().includes('water') || t.toLowerCase().includes('quality') || t.toLowerCase().includes('test')).length
	const feedTasks = allTasks.filter(t => t.toLowerCase().includes('feed') || t.toLowerCase().includes('feeding')).length
	const maintenanceTasks = allTasks.filter(t => t.toLowerCase().includes('maintenance') || t.toLowerCase().includes('equipment') || t.toLowerCase().includes('aerator') || t.toLowerCase().includes('pump')).length
	const cleaningTasks = allTasks.filter(t => t.toLowerCase().includes('clean') || t.toLowerCase().includes('cleaning')).length
	const monitoringTasks = allTasks.filter(t => t.toLowerCase().includes('health') || t.toLowerCase().includes('monitor') || t.toLowerCase().includes('shrimp')).length
	const taskTypes = {
		'Water Quality Testing': waterQualityTasks,
		'Feed Distribution': feedTasks,
		'Equipment Maintenance': maintenanceTasks,
		'Pond Cleaning': cleaningTasks,
		'Health Monitoring': monitoringTasks,
		'Other': allTasks.length - waterQualityTasks - feedTasks - maintenanceTasks - cleaningTasks - monitoringTasks
	}
	
	// Next tasks analysis
	const nextTasks = labor.flatMap(l => l.next_tasks)
	const urgentNextTasks = nextTasks.filter(t => t.toLowerCase().includes('urgent') || t.toLowerCase().includes('emergency') || t.toLowerCase().includes('critical')).length
	
	// Benchmarking calculations
	const totalShrimpCount = feed.reduce((sum, f) => sum + f.shrimp_count, 0)
	const initialShrimpCount = totalShrimpCount * 1.22 // Estimate initial count (assuming 82% survival)
	const survivalRate = totalShrimpCount > 0 && initialShrimpCount > 0 ? (totalShrimpCount / initialShrimpCount) * 100 : 82
	const yieldKgHa = projectedYieldTons > 0 && pondIds.length > 0 ? (projectedYieldTons * 1000) / (pondIds.length * 0.5) : 5200 // Assume 0.5 ha per pond
	const costPerKgShrimp = projectedYieldTons > 0 ? (totalFeedCost + totalLaborCost + totalEnergyCost) / (projectedYieldTons * 1000) : 1150
	const energyPerKgShrimp = projectedYieldTons > 0 && totalEnergyKwh > 0 ? totalEnergyKwh / (projectedYieldTons * 1000) : 3.2

	// Benchmark values
	const benchmarkFCR = 1.60
	const benchmarkSurvival = 78
	const benchmarkYield = 4800
	const benchmarkCostPerKg = 1250
	const benchmarkEnergyPerKg = 3.8

	// Calculate overall performance index
	const fcrScore = fcr > 0 ? (benchmarkFCR / fcr) * 100 : 90 // Lower is better, so invert
	const survivalScore = (survivalRate / benchmarkSurvival) * 100
	const yieldScore = (yieldKgHa / benchmarkYield) * 100
	const costScore = costPerKgShrimp > 0 ? (benchmarkCostPerKg / costPerKgShrimp) * 100 : 92 // Lower is better
	const energyScore = energyPerKgShrimp > 0 ? (benchmarkEnergyPerKg / energyPerKgShrimp) * 100 : 85 // Lower is better
	const overallPerformanceIndex = Math.min(100, (fcrScore + survivalScore + yieldScore + costScore + energyScore) / 5)

	// Performance trends from history + current (so charts reflect real data from _readings / dashboard)
	const performanceTrends = useMemo(() => {
		const snapshots = [...(history || [])].sort(
			(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
		).slice(-5)
		const n = snapshots.length
		const pondCount = Math.max(1, pondIds.length)
		const defaultFcr = 1.5
		const defaultSurvival = 78
		const defaultYield = 4800
		const defaultEnergy = 3.5
		const fcrTrend: number[] = []
		const survivalTrend: number[] = []
		const yieldTrend: number[] = []
		const energyTrend: number[] = []
		for (let i = 0; i < snapshots.length; i++) {
			const snap = snapshots[i]
			const feedList = snap.feed || []
			const energyList = snap.energy || []
			const totalFeedKg = feedList.reduce(
				(sum, f) => sum + (f.feed_amount * (f.feeding_frequency ?? 1)) / 1000,
				0
			)
			const totalBiomass = feedList.reduce(
				(sum, f) => sum + (f.shrimp_count * f.average_weight) / 1000,
				0
			)
			const totalEnergy = energyList.reduce((s, e) => s + (e.total_energy ?? 0), 0)
			const fcrVal = totalFeedKg > 0 && totalBiomass > 0 ? totalFeedKg / totalBiomass : defaultFcr
			const yieldVal = totalBiomass > 0 ? (totalBiomass * 1000) / (pondCount * 0.5) : defaultYield
			const energyVal = totalBiomass > 0 && totalEnergy > 0 ? totalEnergy / (totalBiomass * 1000) : defaultEnergy
			fcrTrend.push(fcrVal)
			survivalTrend.push(i === n - 1 ? survivalRate : defaultSurvival)
			yieldTrend.push(yieldVal)
			energyTrend.push(energyVal)
		}
		// Pad to 5 points so we always show Cycle 1..5 (use first value or default)
		while (fcrTrend.length < 5) {
			fcrTrend.unshift(fcrTrend[0] ?? defaultFcr)
			survivalTrend.unshift(survivalTrend[0] ?? defaultSurvival)
			yieldTrend.unshift(yieldTrend[0] ?? defaultYield)
			energyTrend.unshift(energyTrend[0] ?? defaultEnergy)
		}
		return {
			fcr: fcrTrend.slice(-5),
			survival: survivalTrend.slice(-5),
			yield: yieldTrend.slice(-5),
			energy: energyTrend.slice(-5)
		}
	}, [history, survivalRate, pondIds.length])
	
	// Use decision recommendations from API if available
	const decisionRecommendations = data.decision_recommendations || []
	const harvestRecommendations = decisionRecommendations.filter(r => 
		r.primary_action === 'emergency_response' || r.text.toLowerCase().includes('harvest')
	)
	const energyRecommendations = decisionRecommendations.filter(r => 
		r.primary_action === 'decrease_aeration' || r.primary_action === 'increase_aeration' || 
		r.text.toLowerCase().includes('aerator') || r.text.toLowerCase().includes('energy')
	)
	const laborRecommendations = decisionRecommendations.filter(r => 
		r.primary_action === 'allocate_workers' || r.text.toLowerCase().includes('worker') || 
		r.text.toLowerCase().includes('labor')
	)

	// Chart data
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']
	const harvestChart = {
		labels: months,
		datasets: [
			{
				label: 'Yield',
				data: months.map((_, i) => (i === 4 ? 5.4 : 2 + Math.random() * 2)),
				backgroundColor: months.map((_, i) => (i === 4 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(34, 197, 94, 0.6)')),
				borderColor: months.map((_, i) => (i === 4 ? 'rgba(59, 130, 246, 1)' : 'rgba(34, 197, 94, 0.8)')),
				borderWidth: 1,
				borderRadius: 4
			}
		]
	}

	const feedingPlanChartLabels = primaryPlan
		? primaryPlan.schedule.map((s) => s.time)
		: ['7 AM', '1 PM', '5 PM']
	const feedingPlanChartData = primaryPlan
		? primaryPlan.schedule.map((s) => Math.round(s.amount_g))
		: [0, 0, 0]
	const feedingPlanChart = {
		labels: feedingPlanChartLabels,
		datasets: [
			{
				label: 'Feed Amount (g)',
				data: feedingPlanChartData,
				backgroundColor: feedingPlanChartLabels.map((_, i) =>
					i === 0 ? 'rgba(245, 158, 11, 0.8)' : i === 2 ? 'rgba(245, 158, 11, 0.8)' : 'rgba(34, 197, 94, 0.6)'
				),
				borderColor: 'rgba(34, 197, 94, 0.8)',
				borderWidth: 1,
				borderRadius: 4
			}
		]
	}

	const chartOptions: ChartOptions<'bar'> = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: false }
		},
		scales: {
			x: { grid: { display: false } },
			y: { grid: { display: false }, beginAtZero: true }
		}
	}

	const gridColor = 'rgba(17, 24, 39, 0.08)'
	const axisColor = 'rgba(17, 24, 39, 0.55)'

	// Tab state
	const [activeTab, setActiveTab] = useState<'feeding' | 'labor' | 'benchmarking'>('feeding')

	return (
		<div style={{ padding: '20px 0' }}>
			{/* Header */}
			<div className="panel spanAll" style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1))' }}>
				<div className="panelHeader">
					<div className="panelTitle">AI Optimization Engine</div>
					<div className="panelRight" style={{ gap: 12 }}>
						<span style={{ cursor: 'pointer', fontSize: 20 }}>📷</span>
						<span style={{ cursor: 'pointer', fontSize: 22 }}>🔔</span>
						<span style={{ cursor: 'pointer', fontSize: 20 }}>⚙️</span>
					</div>
				</div>
			</div>

			{/* Decision Support Panel - Core Feature */}
			<div className="panel spanAll" style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(16, 185, 129, 0.08))', border: '2px solid rgba(37, 99, 235, 0.2)' }}>
				<div className="panelHeader">
					<div className="panelTitle" style={{ fontSize: 20, fontWeight: 700 }}>🎯 Decision Support Recommendations</div>
					<div className="panelRight" style={{ fontSize: 13, color: 'var(--muted)' }}>
						Updated {formatDateTime(dashboard.timestamp)}
					</div>
				</div>
				<div style={{ padding: '16px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

					{/* Optimal Labor Allocation */}
					<div style={{ padding: 16, backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 8, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
							<span style={{ fontSize: 24 }}>👨‍🌾</span>
							<div style={{ fontSize: 20, fontWeight: 700 }}>Optimal Labor Allocation</div>
						</div>
						{laborRecommendations.length > 0 ? (
							<div style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--text)' }}>
								{laborRecommendations[0].text}
							</div>
						) : (
							<div style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--text)' }}>
								{urgentPonds.length > 0 ? (
									<>
										Allocate <strong>2 workers</strong> to <strong>Pond {urgentPonds[0]}</strong> for immediate water quality monitoring
										<br />
										<span style={{ color: 'var(--muted)', fontSize: 13 }}>Schedule: Mon/Wed/Fri - Net Cleaning, Tue/Thu - Maintenance</span>
									</>
								) : (
									<>
										<strong>Monday/Wednesday/Friday:</strong> Net Cleaning (2 workers)
										<br />
										<strong>Tuesday/Thursday:</strong> Aerator Maintenance (1 worker)
									</>
								)}
							</div>
						)}
					</div>

					{/* Energy Optimization */}
					<div style={{ padding: 16, backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 8, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
							<span style={{ fontSize: 24 }}>⚡</span>
							<div style={{ fontSize: 20, fontWeight: 700 }}>Energy Optimization</div>
						</div>
						{energyRecommendations.length > 0 ? (
							<div style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--text)' }}>
								{energyRecommendations[0].text}
							</div>
						) : (
							<div style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--text)' }}>
								<strong>Shift aerator usage to night hours</strong> (10 PM - 6 AM) to save energy
								<br />
								<span style={{ color: 'var(--good)', fontSize: 18 }}>Potential savings: Rs. {formatNumber(potentialSavings, { maximumFractionDigits: 0 })}/day</span>
								<br />
								<span style={{ color: 'var(--muted)', fontSize: 18 }}>Reduce pump speed by 15% during off-peak hours</span>
							</div>
						)}
					</div>

					{/* Best Harvest Timing */}
					<div style={{ padding: 16, backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 8, border: '1px solid rgba(220, 38, 38, 0.3)' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
							<span style={{ fontSize: 24 }}>🦐</span>
							<div style={{ fontSize: 20, fontWeight: 700 }}>Best Harvest Timing</div>
						</div>
						{harvestRecommendations.length > 0 ? (
							<div style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--text)' }}>
								{harvestRecommendations[0].text}
							</div>
						) : bestHarvestPond ? (
							<div style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--text)' }}>
								<strong>Harvest Pond {bestHarvestPond.pondId}</strong> in <strong>{bestHarvestPond.daysToHarvest}-{bestHarvestPond.daysToHarvest + 2} days</strong> to maximize profit
								<br />
								<span style={{ color: 'var(--muted)', fontSize: 13 }}>
									Current weight: {formatNumber(bestHarvestPond.weight, { maximumFractionDigits: 1 })}g | 
									Projected yield: {formatNumber(bestHarvestPond.biomass / 1000, { maximumFractionDigits: 2 })} tons
								</span>
							</div>
						) : daysToOptimalWeight > 0 ? (
							<div style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--text)' }}>
								Optimal harvest window: <strong>{daysToOptimalWeight}-{daysToOptimalWeight + 2} days</strong>
								<br />
								<span style={{ color: 'var(--muted)', fontSize: 18 }}>
									Current avg weight: {formatNumber(avgWeight, { maximumFractionDigits: 1 })}g | 
									Target: {targetHarvestWeight}g
								</span>
							</div>
						) : (
							<div style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--muted)' }}>
								Monitor growth rates to determine optimal harvest timing
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Optimization Tabs Navigation */}
			<div className="panel spanAll" style={{ marginBottom: 16 }}>
				<div style={{ display: 'flex', gap: 8, borderBottom: '2px solid rgba(17, 24, 39, 0.1)' }}>
					<button
						onClick={() => setActiveTab('feeding')}
						style={{
							padding: '12px 20px',
							fontSize: 20,
							fontWeight: 600,
							border: 'none',
							background: 'transparent',
							color: activeTab === 'feeding' ? '#16a34a' : 'var(--muted)',
							borderBottom: activeTab === 'feeding' ? '3px solid #16a34a' : '3px solid transparent',
							cursor: 'pointer',
							transition: 'all 0.2s',
							display: 'flex',
							alignItems: 'center',
							gap: 6
						}}
					>
						<span>🍽️</span>
						<span>Feeding Optimization</span>
					</button>
					<button
						onClick={() => setActiveTab('labor')}
						style={{
							padding: '12px 20px',
							fontSize: 20,
							fontWeight: 600,
							border: 'none',
							background: 'transparent',
							color: activeTab === 'labor' ? '#f59e0b' : 'var(--muted)',
							borderBottom: activeTab === 'labor' ? '3px solid #f59e0b' : '3px solid transparent',
							cursor: 'pointer',
							transition: 'all 0.2s',
							display: 'flex',
							alignItems: 'center',
							gap: 6
						}}
					>
						<span>👨‍🌾</span>
						<span>Labor Optimization</span>
					</button>
					<button
						onClick={() => setActiveTab('benchmarking')}
						style={{
							padding: '12px 20px',
							fontSize: 20,
							fontWeight: 600,
							border: 'none',
							background: 'transparent',
							color: activeTab === 'benchmarking' ? '#8b5cf6' : 'var(--muted)',
							borderBottom: activeTab === 'benchmarking' ? '3px solid #8b5cf6' : '3px solid transparent',
							cursor: 'pointer',
							transition: 'all 0.2s',
							display: 'flex',
							alignItems: 'center',
							gap: 6
						}}
					>
						<span>📈</span>
						<span>Benchmarking</span>
					</button>
				</div>
			</div>

			{/* Keep feed + labor mounted but hidden so AI Action Plan / feed optimization state
			    is not lost when switching tabs (avoids slow re-fetch and blank UI). */}
			<div style={{ display: activeTab === 'feeding' ? 'block' : 'none' }} aria-hidden={activeTab !== 'feeding'}>
				<FeedOptimizationView data={data} history={history} pondFilter={pondFilter} ponds={ponds} />
			</div>

			<div style={{ display: activeTab === 'labor' ? 'block' : 'none' }} aria-hidden={activeTab !== 'labor'}>
				<LaborOptimizationView data={data} history={history} pondFilter={pondFilter} ponds={ponds} embedded />
			</div>

			{activeTab === 'benchmarking' && (
				<>
			{/* Benchmarking Section */}
			<div className="panel spanAll" style={{ marginBottom: 12, background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.08))', border: '2px solid rgba(139, 92, 246, 0.2)' }}>
				<div className="panelHeader">
					<div className="panelTitle" style={{ fontSize: 20, fontWeight: 700 }}>📈 AI KPI Benchmarking & Performance Overview</div>
					<div className="panelRight" style={{ fontSize: 20, color: 'var(--muted)' }}>
						Updated {formatDateTime(dashboard.timestamp)}
					</div>
				</div>
			</div>

			<div className="dashGrid" style={{ marginBottom: 12 }}>
				{/* KPI Comparison */}
				<div className="panel" style={{ gridColumn: 'span 2' }}>
					<div className="panelHeader">
						<div className="panelTitle">KPI Comparison</div>
					</div>
					<div style={{ padding: '8px 0' }}>
						<div style={{ overflowX: 'auto' }}>
							<table style={{ width: '100%', borderCollapse: 'collapse' }}>
								<thead>
									<tr style={{ borderBottom: '2px solid rgba(17, 24, 39, 0.1)' }}>
										<th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 20, fontWeight: 600, color: 'var(--muted)' }}>KPI</th>
										<th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 20, fontWeight: 600, color: 'var(--muted)' }}>Your Farm</th>
										<th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 20, fontWeight: 600, color: 'var(--muted)' }}>Benchmark</th>
										<th style={{ padding: '6px 10px', textAlign: 'center', fontSize: 20, fontWeight: 600, color: 'var(--muted)' }}>Status</th>
									</tr>
								</thead>
								<tbody>
									{[
										{ kpi: 'Feed Conversion Ratio (FCR)', your: fcr, benchmark: benchmarkFCR, status: fcr < benchmarkFCR ? 'better' : 'warning' },
										{ kpi: 'Feed Efficiency (%)', your: feedOptimized, benchmark: 85, status: feedOptimized > 85 ? 'better' : 'warning', format: 'percentage' },
										{ kpi: 'Survival Rate (%)', your: survivalRate, benchmark: benchmarkSurvival, status: survivalRate > benchmarkSurvival ? 'better' : 'warning' },
										{ kpi: 'Yield (kg/ha/cycle)', your: yieldKgHa, benchmark: benchmarkYield, status: yieldKgHa > benchmarkYield ? 'better' : 'warning' },
										{ kpi: 'Cost per kg shrimp', your: costPerKgShrimp, benchmark: benchmarkCostPerKg, status: costPerKgShrimp < benchmarkCostPerKg ? 'better' : 'warning', format: 'currency' },
										{ kpi: 'Energy per kg shrimp', your: energyPerKgShrimp, benchmark: benchmarkEnergyPerKg, status: energyPerKgShrimp < benchmarkEnergyPerKg ? 'better' : 'warning', format: 'energy' }
									].map((row, idx) => (
										<tr key={idx} style={{ borderBottom: '1px solid rgba(17, 24, 39, 0.05)' }}>
											<td style={{ padding: '6px 10px', fontSize: 20, color: 'var(--text)' }}>{row.kpi}</td>
											<td style={{ padding: '6px 10px', fontSize: 20, fontWeight: 600, textAlign: 'right', color: 'var(--text)' }}>
												{row.format === 'currency' ? `Rs. ${formatNumber(row.your, { maximumFractionDigits: 0 })}` :
												 row.format === 'energy' ? `${formatNumber(row.your, { maximumFractionDigits: 1 })} kWh` :
												 row.format === 'percentage' ? `${formatNumber(row.your, { maximumFractionDigits: 0 })}%` :
												 formatNumber(row.your, { maximumFractionDigits: row.kpi.includes('%') ? 0 : 2 })}
											</td>
											<td style={{ padding: '6px 10px', fontSize: 20, textAlign: 'right', color: 'var(--muted)' }}>
												{row.format === 'currency' ? `Rs. ${formatNumber(row.benchmark, { maximumFractionDigits: 0 })}` :
												 row.format === 'energy' ? `${formatNumber(row.benchmark, { maximumFractionDigits: 1 })} kWh` :
												 row.format === 'percentage' ? `${formatNumber(row.benchmark, { maximumFractionDigits: 0 })}%` :
												 formatNumber(row.benchmark, { maximumFractionDigits: row.kpi.includes('%') ? 0 : 2 })}
											</td>
											<td style={{ padding: '6px 10px', textAlign: 'center' }}>
												<div style={{
													padding: '3px 8px',
													borderRadius: 10,
													fontSize: 13,
													fontWeight: 600,
													display: 'inline-block',
													backgroundColor: row.status === 'better' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
													color: row.status === 'better' ? '#16a34a' : '#f59e0b',
													border: `1px solid ${row.status === 'better' ? '#16a34a' : '#f59e0b'}`
												}}>
													{row.status === 'better' ? '✓ Better' : '⚠ Warning'}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<p style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
							KPIs are from the current dashboard snapshot. Click <strong>Refresh</strong> in the top bar after new data is saved, or run a monitoring cycle, to see updated values.
						</p>
						<div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 6, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: 6 }}>
								<span style={{ fontSize: 20 }}>✅</span>
								<span style={{ fontSize: 20, color: 'var(--text)' }}>Your farm outperforms benchmarks in 4 of 5 KPIs.</span>
							</div>
							<div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 6, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 6 }}>
								<span style={{ fontSize: 20 }}>⚠️</span>
								<span style={{ fontSize: 20, color: 'var(--text)' }}>Energy efficiency can be improved by {formatNumber(((benchmarkEnergyPerKg - energyPerKgShrimp) / benchmarkEnergyPerKg) * 100, { maximumFractionDigits: 0 })}% to match industry standards.</span>
							</div>
						</div>
					</div>
				</div>

				{/* Overall Performance Index */}
				<div className="panel">
					<div className="panelHeader">
						<div className="panelTitle">Overall Performance Index</div>
					</div>
					<div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
						<div style={{ position: 'relative' }}>
							<CircularProgress percentage={overallPerformanceIndex} size={140} color="#16a34a" />
							<div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', marginTop: 38 }}>
								<div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Efficient</div>
							</div>
						</div>
						<div style={{ textAlign: 'center', width: '100%' }}>
							<div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 2 }}>Industry Avg 85%</div>
							<div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
								Overall Performance Index vs Industry Avg 85%
							</div>
						</div>
					</div>
				</div>

				{/* Performance Trends */}
				<div className="panel" style={{ gridColumn: 'span 2' }}>
					<div className="panelHeader">
						<div className="panelTitle">Performance Trends</div>
					</div>
					<div style={{ padding: '8px 0' }}>
						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
							{[
								{ label: 'Feed Conversion Ratio', data: performanceTrends.fcr, color: '#16a34a' },
								{ label: 'Survival Rate (%)', data: performanceTrends.survival, color: '#3b82f6' },
								{ label: 'Yield (kg/ha/cycle)', data: performanceTrends.yield, color: '#8b5cf6' },
								{ label: 'Energy per kg shrimp', data: performanceTrends.energy, color: '#f59e0b' }
							].map((metric, idx) => (
								<div key={idx} style={{ padding: 6, backgroundColor: 'rgba(255, 255, 255, 0.5)', borderRadius: 6, border: '1px solid rgba(17, 24, 39, 0.1)' }}>
									<div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>{metric.label}</div>
									<div style={{ height: 60 }}>
										<Line
											data={{
												labels: ['Cycle 1', 'Cycle 2', 'Cycle 3', 'Cycle 4', 'Cycle 5'],
												datasets: [{
													label: metric.label,
													data: metric.data,
													borderColor: metric.color,
													backgroundColor: metric.color + '20',
													tension: 0.4,
													fill: true,
													pointRadius: 2
												}]
											}}
											options={{
												responsive: true,
												maintainAspectRatio: false,
												plugins: { legend: { display: false } },
												scales: {
													y: { grid: { display: false }, beginAtZero: false },
													x: { grid: { display: false } }
												}
											} as ChartOptions<'line'>}
										/>
									</div>
								</div>
							))}
						</div>
						<div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 6, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: 6 }}>
								<span style={{ fontSize: 20 }}>📈</span>
								<span style={{ fontSize: 20, color: 'var(--text)' }}>Your farm outperforms benchmarks in 4 of 5 KPIs.</span>
							</div>
							<div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 6, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 6 }}>
								<span style={{ fontSize: 20 }}>⚠️</span>
								<span style={{ fontSize: 20, color: 'var(--text)' }}>Energy efficiency can be improved by {formatNumber(((benchmarkEnergyPerKg - energyPerKgShrimp) / benchmarkEnergyPerKg) * 100, { maximumFractionDigits: 0 })}% to match industry standards.</span>
							</div>
						</div>
					</div>
				</div>

				{/* AI Insights */}
				<div className="panel">
					<div className="panelHeader">
						<div className="panelTitle">AI Insights</div>
					</div>
					<div style={{ padding: '8px 0' }}>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							<div style={{ padding: 8, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: 6, border: '1px solid rgba(34, 197, 94, 0.2)' }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
									<span style={{ fontSize: 20 }}>📈</span>
									<span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>Performance Status</span>
								</div>
								<div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
									Your farm outperforms benchmarks in 4 of 5 KPIs.
								</div>
							</div>
							<div style={{ padding: 8, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 6, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
									<span style={{ fontSize: 20 }}>⚠️</span>
									<span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>Energy Optimization</span>
								</div>
								<div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
									Energy optimization recommended — reduce aerator runtime by 15%.
								</div>
							</div>
							<div style={{ padding: 8, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
									<span style={{ fontSize: 20 }}>ℹ️</span>
									<span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>FCR Improvement</span>
								</div>
								<div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
									FCR improvement sustained for 3 consecutive cycles.
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
				</>
			)}
		</div>
	)
}
