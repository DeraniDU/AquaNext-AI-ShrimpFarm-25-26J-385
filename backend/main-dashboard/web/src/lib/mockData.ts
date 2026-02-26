import type {
	DashboardApiResponse,
	HistoryApiResponse,
	ForecastsResponse,
	WaterQualityStatus,
	ActionType
} from './types'

// Helper to generate random values within ranges
const random = (min: number, max: number) => min + Math.random() * (max - min)
const randomInt = (min: number, max: number) => Math.floor(random(min, max + 1))
const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

// Generate water quality status based on parameters
function getWaterQualityStatus(ph: number, do2: number, ammonia: number): WaterQualityStatus {
	if (ph < 6.5 || ph > 8.5 || do2 < 3 || ammonia > 1.0) return 'critical'
	if (ph < 7.0 || ph > 8.0 || do2 < 4 || ammonia > 0.5) return 'poor'
	if (ph < 7.2 || ph > 7.8 || do2 < 5 || ammonia > 0.3) return 'fair'
	if (ph >= 7.4 && ph <= 7.6 && do2 >= 6 && ammonia <= 0.1) return 'excellent'
	return 'good'
}

// Generate mock dashboard data
export function generateMockDashboardData(ponds: number): DashboardApiResponse {
	const now = new Date().toISOString()
	const waterQualityStatuses: Record<string, WaterQualityStatus> = {}
	
	const water_quality = Array.from({ length: ponds }, (_, i) => {
		const pondId = i + 1
		const ph = random(7.0, 8.0)
		const temperature = random(25, 30)
		const dissolved_oxygen = random(4, 8)
		const salinity = random(15, 25)
		const ammonia = random(0, 0.5)
		const nitrite = random(0, 0.2)
		const nitrate = random(0, 5)
		const turbidity = random(10, 50)
		const status = getWaterQualityStatus(ph, dissolved_oxygen, ammonia)
		
		waterQualityStatuses[`pond_${pondId}`] = status
		
		return {
			timestamp: now,
			pond_id: pondId,
			ph: parseFloat(ph.toFixed(2)),
			temperature: parseFloat(temperature.toFixed(1)),
			dissolved_oxygen: parseFloat(dissolved_oxygen.toFixed(2)),
			salinity: parseFloat(salinity.toFixed(1)),
			ammonia: parseFloat(ammonia.toFixed(3)),
			nitrite: parseFloat(nitrite.toFixed(3)),
			nitrate: parseFloat(nitrate.toFixed(2)),
			turbidity: parseFloat(turbidity.toFixed(1)),
			status,
			alerts: status === 'critical' || status === 'poor' ? [`Water quality ${status} in Pond ${pondId}`] : []
		}
	})

	const feed = Array.from({ length: ponds }, (_, i) => {
		const pondId = i + 1
		const shrimpCount = randomInt(50000, 100000)
		const averageWeight = random(15, 25)
		const feedAmount = random(100, 200)
		
		return {
			timestamp: now,
			pond_id: pondId,
			shrimp_count: shrimpCount,
			average_weight: parseFloat(averageWeight.toFixed(1)),
			feed_amount: parseFloat(feedAmount.toFixed(1)),
			feed_type: randomChoice(['35%', '40%', 'Premium']),
			feeding_frequency: randomInt(2, 4),
			predicted_next_feeding: new Date(Date.now() + randomInt(4, 8) * 3600000).toISOString()
		}
	})

	const energy = Array.from({ length: ponds }, (_, i) => {
		const pondId = i + 1
		const aeratorUsage = random(0.3, 0.7)
		const pumpUsage = random(0.2, 0.5)
		const heaterUsage = random(0.1, 0.3)
		const totalEnergy = aeratorUsage * 50 + pumpUsage * 30 + heaterUsage * 20
		const cost = totalEnergy * 25 // LKR per kWh
		
		return {
			timestamp: now,
			pond_id: pondId,
			aerator_usage: parseFloat(aeratorUsage.toFixed(2)),
			pump_usage: parseFloat(pumpUsage.toFixed(2)),
			heater_usage: parseFloat(heaterUsage.toFixed(2)),
			total_energy: parseFloat(totalEnergy.toFixed(2)),
			cost: parseFloat(cost.toFixed(2)),
			efficiency_score: parseFloat(random(0.7, 0.95).toFixed(2))
		}
	})

	const labor = Array.from({ length: ponds }, (_, i) => {
		const pondId = i + 1
		const tasks = ['Feeding', 'Water sampling', 'Equipment check', 'Data recording']
		const completedTasks = tasks.slice(0, randomInt(2, 4))
		
		return {
			timestamp: now,
			pond_id: pondId,
			tasks_completed: completedTasks,
			time_spent: randomInt(2, 6),
			worker_count: randomInt(2, 4),
			efficiency_score: parseFloat(random(0.75, 0.95).toFixed(2)),
			next_tasks: ['Feeding', 'Monitoring', 'Maintenance']
		}
	})

	// Calculate overall health score
	const avgWaterStatus = Object.values(waterQualityStatuses).reduce((acc, status) => {
		const scores: Record<WaterQualityStatus, number> = {
			excellent: 1.0,
			good: 0.8,
			fair: 0.6,
			poor: 0.4,
			critical: 0.2
		}
		return acc + scores[status]
	}, 0) / ponds

	const avgFeedEfficiency = energy.reduce((acc, e) => acc + e.efficiency_score, 0) / ponds
	const avgEnergyEfficiency = energy.reduce((acc, e) => acc + e.efficiency_score, 0) / ponds
	const avgLaborEfficiency = labor.reduce((acc, l) => acc + l.efficiency_score, 0) / ponds

	const insights = [
		{
			timestamp: now,
			insight_type: 'water_quality',
			priority: randomChoice(['info', 'warning', 'critical'] as const),
			message: 'Water quality parameters are within acceptable ranges',
			recommendations: ['Continue monitoring', 'Maintain current feeding schedule'],
			affected_ponds: [1, 2],
			data: {}
		}
	]

	const alerts: string[] = []
	water_quality.forEach((wq) => {
		if (wq.status === 'critical' || wq.status === 'poor') {
			alerts.push(`Pond ${wq.pond_id}: ${wq.status} water quality`)
		}
	})

	const recommendations = [
		'Monitor dissolved oxygen levels closely',
		'Adjust feeding schedule based on growth rates',
		'Maintain optimal water temperature range'
	]

	// Generate decision recommendations
	const decision_recommendations = Array.from({ length: Math.min(ponds, 3) }, (_, i) => {
		const pondId = i + 1
		const actions: ActionType[] = [
			'no_action',
			'increase_aeration',
			'decrease_aeration',
			'water_exchange',
			'adjust_feed',
			'monitor_closely'
		]
		const primaryAction = randomChoice(actions)
		
		return {
			pond_id: pondId,
			priority_rank: i + 1,
			urgency_score: parseFloat(random(0.3, 0.8).toFixed(2)),
			confidence: parseFloat(random(0.7, 0.95).toFixed(2)),
			primary_action: primaryAction,
			text: `Recommended action for Pond ${pondId}: ${primaryAction.replace(/_/g, ' ')}`
		}
	})

	// Generate multi-pond decision
	const pondPriorities: Record<string, number> = {}
	const urgentPonds: number[] = []
	const recommendedActions: Record<string, any> = {}
	
	Array.from({ length: ponds }, (_, i) => {
		const pondId = i + 1
		const priority = random(0.5, 1.0)
		pondPriorities[pondId.toString()] = parseFloat(priority.toFixed(2))
		
		if (priority > 0.7) {
			urgentPonds.push(pondId)
		}
		
		const actions: ActionType[] = ['no_action', 'increase_aeration', 'adjust_feed']
		recommendedActions[pondId.toString()] = {
			timestamp: now,
			pond_id: pondId,
			primary_action: randomChoice(actions),
			action_intensity: parseFloat(random(0.3, 0.8).toFixed(2)),
			secondary_actions: [],
			priority_rank: pondId,
			urgency_score: parseFloat(priority.toFixed(2)),
			recommended_feed_amount: random(100, 200),
			recommended_aerator_level: random(0.4, 0.8),
			recommended_pump_level: random(0.2, 0.5),
			recommended_heater_level: random(0.1, 0.3),
			confidence: parseFloat(random(0.7, 0.95).toFixed(2)),
			reasoning: `Optimization recommendation for Pond ${pondId}`,
			affected_factors: ['water_quality', 'feed_efficiency']
		}
	})

	const decisions = {
		timestamp: now,
		pond_priorities: pondPriorities,
		urgent_ponds: urgentPonds,
		recommended_actions: recommendedActions,
		overall_urgency: parseFloat(random(0.4, 0.7).toFixed(2)),
		resource_allocation: {
			workers: randomInt(4, 8),
			energy: random(500, 1000)
		}
	}

	return {
		dashboard: {
			timestamp: now,
			overall_health_score: parseFloat((avgWaterStatus * 100).toFixed(1)),
			water_quality_summary: waterQualityStatuses,
			feed_efficiency: parseFloat(avgFeedEfficiency.toFixed(2)),
			energy_efficiency: parseFloat(avgEnergyEfficiency.toFixed(2)),
			labor_efficiency: parseFloat(avgLaborEfficiency.toFixed(2)),
			insights,
			alerts,
			recommendations
		},
		water_quality,
		feed,
		energy,
		labor,
		decision_agent_type: 'mock',
		decisions,
		decision_recommendations
	}
}

// Generate mock history data
export function generateMockHistoryData(days: number = 7): HistoryApiResponse {
	const items: HistoryApiResponse['items'] = []
	const now = Date.now()
	
	for (let day = days; day >= 0; day--) {
		const timestamp = new Date(now - day * 24 * 60 * 60 * 1000).toISOString()
		const ponds = 4
		
		const water_quality = Array.from({ length: ponds }, (_, i) => {
			const pondId = i + 1
			const ph = random(7.0, 8.0)
			const temperature = random(25, 30)
			const dissolved_oxygen = random(4, 8)
			const salinity = random(15, 25)
			const status = getWaterQualityStatus(ph, dissolved_oxygen, random(0, 0.5))
			
			return {
				pond_id: pondId,
				ph: parseFloat(ph.toFixed(2)),
				temperature: parseFloat(temperature.toFixed(1)),
				dissolved_oxygen: parseFloat(dissolved_oxygen.toFixed(2)),
				salinity: parseFloat(salinity.toFixed(1)),
				status,
				alerts: status === 'critical' || status === 'poor' ? [`Alert for Pond ${pondId}`] : []
			}
		})

		const feed = Array.from({ length: ponds }, (_, i) => {
			const pondId = i + 1
			return {
				pond_id: pondId,
				shrimp_count: randomInt(50000, 100000),
				average_weight: parseFloat(random(15, 25).toFixed(1)),
				feed_amount: parseFloat(random(100, 200).toFixed(1)),
				feed_type: randomChoice(['35%', '40%', 'Premium']),
				feeding_frequency: randomInt(2, 4)
			}
		})

		const energy = Array.from({ length: ponds }, (_, i) => {
			return {
				pond_id: i + 1,
				total_energy: parseFloat(random(20, 50).toFixed(2)),
				cost: parseFloat(random(500, 1250).toFixed(2)),
				efficiency_score: parseFloat(random(0.7, 0.95).toFixed(2))
			}
		})

		const labor = Array.from({ length: ponds }, (_, i) => {
			return {
				pond_id: i + 1,
				tasks_completed: ['Feeding', 'Sampling', 'Monitoring'],
				time_spent: randomInt(2, 6),
				worker_count: randomInt(2, 4),
				efficiency_score: parseFloat(random(0.75, 0.95).toFixed(2))
			}
		})

		items.push({
			source: 'mock',
			timestamp,
			water_quality,
			feed,
			energy,
			labor
		})
	}

	return {
		count: items.length,
		items
	}
}

// Generate mock forecasts data
export function generateMockForecastsData(ponds: number = 4, forecastDays: number = 90): ForecastsResponse {
	const now = new Date().toISOString()
	const baseWeight = 18
	const baseBiomass = 800
	
	const growth_forecast = Array.from({ length: forecastDays }, (_, day) => {
		const growthRate = 0.15 + day * 0.001
		const avgWeight = baseWeight * (1 + growthRate * day / 30)
		const biomass = baseBiomass * (1 + growthRate * day / 30)
		
		return {
			day: day + 1,
			avg_weight_g: parseFloat(avgWeight.toFixed(1)),
			biomass_kg: parseFloat(biomass.toFixed(2))
		}
	})

	const water_quality_forecast = Array.from({ length: forecastDays }, (_, day) => {
		return {
			day: day + 1,
			ph: parseFloat(random(7.2, 7.8).toFixed(2)),
			dissolved_oxygen: parseFloat(random(5, 7).toFixed(2)),
			temperature: parseFloat(random(26, 29).toFixed(1)),
			salinity: parseFloat(random(18, 22).toFixed(1))
		}
	})

	const disease_risk_forecast = Array.from({ length: forecastDays }, (_, day) => {
		const riskLevel = day < 30 ? random(0.1, 0.3) : random(0.2, 0.5)
		return {
			day: day + 1,
			risk_level: parseFloat(riskLevel.toFixed(2)),
			risk_type: riskLevel > 0.4 ? 'bacterial' : 'low',
			factors: riskLevel > 0.4 ? ['water_quality', 'temperature'] : []
		}
	})

	const profit_forecast = Array.from({ length: forecastDays }, (_, day) => {
		const revenue = 2000 * (baseBiomass * (1 + 0.15 * day / 30))
		const costs = 500 + day * 50
		const profit = revenue - costs
		
		return {
			day: day + 1,
			revenue_lkr: parseFloat(revenue.toFixed(2)),
			costs_lkr: parseFloat(costs.toFixed(2)),
			profit_lkr: parseFloat(profit.toFixed(2))
		}
	})

	const harvestWindow = {
		optimal_start: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
		optimal_end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
		projected_yield_tons: parseFloat((baseBiomass * 1.5 / 1000).toFixed(2)),
		fcr: parseFloat(random(1.3, 1.6).toFixed(2))
	}

	const ai_predictions = [
		'Growth rate is on track for optimal harvest window',
		'Water quality parameters should be monitored closely during peak growth phase',
		'Expected harvest yield: 1.2-1.5 tons per pond',
		'Disease risk remains low with current management practices'
	]

	return {
		forecasts: {
			growth_forecast,
			water_quality_forecast,
			disease_risk_forecast,
			profit_forecast,
			harvest_window: harvestWindow,
			ai_predictions
		},
		timestamp: now,
		forecast_days: forecastDays
	}
}


