import { useCallback, useEffect, useRef, useState } from 'react'
import type { PredictionResponse, BatchPredictionResponse, WaterQualityData, WQIClass, SimpleStatus, TimeToDanger, TrendAnalysis, NightSafety, RecoveryPrediction, SensorHealth, ConfidenceScores } from './types'

const API_BASE = 'http://localhost:5001'

type PredictionState = {
	data: PredictionResponse | null
	loading: boolean
	error: string | null
}

type BatchPredictionState = {
	data: BatchPredictionResponse | null
	loading: boolean
	error: string | null
}

// Optimal ranges for calculations
const OPTIMAL_RANGES = {
	DO: { optimal_min: 5.0, optimal_max: 8.0, critical_min: 3.0, critical_max: 15.0 },
	pH: { optimal_min: 7.5, optimal_max: 8.5, critical_min: 6.5, critical_max: 9.5 },
	Temperature: { optimal_min: 26.0, optimal_max: 30.0, critical_min: 20.0, critical_max: 35.0 },
	Salinity: { optimal_min: 15.0, optimal_max: 25.0, critical_min: 5.0, critical_max: 40.0 },
	Ammonia: { optimal_min: 0.0, optimal_max: 0.05, critical_min: 0.0, critical_max: 0.5 },
	Nitrite: { optimal_min: 0.0, optimal_max: 0.25, critical_min: 0.0, critical_max: 1.0 },
}

export function usePrediction() {
	const [state, setState] = useState<PredictionState>({
		data: null,
		loading: false,
		error: null
	})

	const predict = useCallback(async (sensors: {
		pH: number
		Temperature: number
		DO: number
		Salinity: number
		Ammonia?: number
		Nitrite?: number
		Turbidity?: number
	}) => {
		setState(s => ({ ...s, loading: true, error: null }))

		try {
			const response = await fetch(`${API_BASE}/api/predict`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					pH: sensors.pH,
					Temperature: sensors.Temperature,
					DO: sensors.DO,
					Salinity: sensors.Salinity,
					Ammonia: sensors.Ammonia ?? 0.05,
					Nitrite: sensors.Nitrite ?? 0.1,
					Turbidity: sensors.Turbidity ?? 30
				})
			})

			if (!response.ok) {
				throw new Error(`API error: ${response.status}`)
			}

			const data = await response.json()
			setState({ data, loading: false, error: null })
			return data
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Prediction failed'
			setState(s => ({ ...s, loading: false, error: message }))
			return null
		}
	}, [])

	return { ...state, predict }
}

export function useBatchPrediction() {
	const [state, setState] = useState<BatchPredictionState>({
		data: null,
		loading: false,
		error: null
	})

	const predictBatch = useCallback(async (waterQualityData: WaterQualityData[]) => {
		setState(s => ({ ...s, loading: true, error: null }))

		try {
			const ponds = waterQualityData.map(wq => ({
				pond_id: wq.pond_id,
				pH: wq.ph,
				Temperature: wq.temperature,
				DO: wq.dissolved_oxygen,
				Salinity: wq.salinity,
				Ammonia: wq.ammonia,
				Nitrite: wq.nitrite,
				Turbidity: wq.turbidity
			}))

			const response = await fetch(`${API_BASE}/api/predict/batch`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ponds })
			})

			if (!response.ok) {
				throw new Error(`API error: ${response.status}`)
			}

			const data = await response.json()
			setState({ data, loading: false, error: null })
			return data
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Batch prediction failed'
			setState(s => ({ ...s, loading: false, error: message }))
			return null
		}
	}, [])

	return { ...state, predictBatch }
}

export function useAutoPredict(waterQualityData: WaterQualityData[], intervalMs: number = 30000) {
	const { data, loading, error, predictBatch } = useBatchPrediction()
	const intervalRef = useRef<number | null>(null)

	const runPrediction = useCallback(() => {
		if (waterQualityData.length > 0) {
			void predictBatch(waterQualityData)
		}
	}, [waterQualityData, predictBatch])

	useEffect(() => {
		// Initial prediction
		runPrediction()

		// Set up interval
		intervalRef.current = window.setInterval(runPrediction, intervalMs)

		return () => {
			if (intervalRef.current) {
				window.clearInterval(intervalRef.current)
			}
		}
	}, [runPrediction, intervalMs])

	return { data, loading, error, refresh: runPrediction }
}

// Simulated prediction for when API is not available
export function simulatePrediction(sensors: {
	pH: number
	Temperature: number
	DO: number
	Salinity: number
}): PredictionResponse {
	// Compute WQI with proper scoring
	const computeWQI = (ph: number, temp: number, doVal: number, ammonia = 0.05, nitrite = 0.1): number => {
		const scoreParameter = (value: number, param: keyof typeof OPTIMAL_RANGES): number => {
			const ranges = OPTIMAL_RANGES[param]
			const optMin = ranges.optimal_min
			const optMax = ranges.optimal_max
			const critMin = ranges.critical_min
			const critMax = ranges.critical_max

			if (optMin <= value && value <= optMax) return 100
			if (value < optMin) {
				if (value <= critMin) return 0
				return Math.max(0, 100 * (value - critMin) / (optMin - critMin))
			} else {
				if (value >= critMax) return 0
				return Math.max(0, 100 * (critMax - value) / (critMax - optMax))
			}
		}

		const scores = {
			DO: scoreParameter(doVal, 'DO'),
			pH: scoreParameter(ph, 'pH'),
			Temperature: scoreParameter(temp, 'Temperature'),
			Ammonia: scoreParameter(ammonia, 'Ammonia'),
			Nitrite: scoreParameter(nitrite, 'Nitrite'),
		}

		const weights = { DO: 0.35, pH: 0.25, Temperature: 0.20, Ammonia: 0.12, Nitrite: 0.08 }
		const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
		
		return Math.round(
			Object.entries(scores).reduce((sum, [key, score]) => 
				sum + score * weights[key as keyof typeof weights], 0
			) / totalWeight * 10
		) / 10
	}

	const categorizeWQI = (wqi: number): WQIClass => {
		if (wqi >= 75) return 'Good'
		if (wqi >= 50) return 'Medium'
		if (wqi >= 25) return 'Bad'
		return 'Very Bad'
	}

	const wqi = computeWQI(sensors.pH, sensors.Temperature, sensors.DO)
	const wqiClass = categorizeWQI(wqi)

	// Simulate forecasts with realistic drift
	const simulateForecast = (horizon: number) => {
		const drift = horizon / 24
		return {
			pH: Math.round((sensors.pH + (Math.random() - 0.5) * 0.3 * drift) * 100) / 100,
			DO: Math.round(Math.max(3, sensors.DO + (Math.random() - 0.6) * drift) * 100) / 100,
			Temperature: Math.round((sensors.Temperature + (Math.random() - 0.3) * 1.5 * drift) * 10) / 10,
			Salinity: Math.round((sensors.Salinity + (Math.random() - 0.5) * drift) * 10) / 10
		}
	}

	const forecast6h = simulateForecast(6)
	const forecast12h = simulateForecast(12)
	const forecast24h = simulateForecast(24)

	// Calculate time to danger
	const calculateTimeToDanger = (): TimeToDanger => {
		const horizons = [
			{ key: '6h', hours: 6, forecast: forecast6h },
			{ key: '12h', hours: 12, forecast: forecast12h },
			{ key: '24h', hours: 24, forecast: forecast24h },
		]

		for (const { hours, forecast } of horizons) {
			if (forecast.DO < OPTIMAL_RANGES.DO.critical_min) {
				return {
					is_safe: false,
					hours_remaining: hours,
					critical_parameter: 'Dissolved Oxygen',
					danger_type: 'critical_low',
					message: `Warning: DO will become dangerous in ~${hours} hours`,
					urgency: hours <= 6 ? 'critical' : 'warning'
				}
			}
		}

		// Check current values
		if (sensors.DO < OPTIMAL_RANGES.DO.critical_min) {
			return {
				is_safe: false,
				hours_remaining: 0,
				critical_parameter: 'Dissolved Oxygen',
				danger_type: 'already_critical',
				message: 'CRITICAL: DO already dangerous!',
				urgency: 'critical'
			}
		}

		return {
			is_safe: true,
			hours_remaining: null,
			critical_parameter: null,
			danger_type: null,
			message: 'Water quality will remain safe for 24+ hours',
			urgency: 'normal'
		}
	}

	// Calculate night safety
	const calculateNightSafety = (): NightSafety => {
		const nightDropPercent = 0.30
		const predictedNightDo = sensors.DO * (1 - nightDropPercent)
		const criticalThreshold = OPTIMAL_RANGES.DO.critical_min
		const isSafe = predictedNightDo >= criticalThreshold
		const safetyMargin = predictedNightDo - criticalThreshold

		return {
			current_do: sensors.DO,
			predicted_night_do: Math.round(predictedNightDo * 100) / 100,
			is_night_safe: isSafe,
			safety_margin: Math.round(safetyMargin * 100) / 100,
			risk_level: !isSafe ? 'critical' : safetyMargin < 1.5 ? 'warning' : 'safe',
			recommendation: {
				aerator_setting: !isSafe ? 'maximum' : safetyMargin < 1.0 ? 'high' : safetyMargin < 2.0 ? 'moderate' : 'normal',
				message: !isSafe 
					? 'HIGH RISK: DO will drop critically low tonight. Run aerators at maximum!'
					: safetyMargin < 1.5 
					? 'Moderate risk: Increase aeration during night hours'
					: 'Night safety: DO levels should remain safe'
			}
		}
	}

	// Calculate recovery prediction
	const calculateRecovery = (): RecoveryPrediction => {
		const targetWqi = 75
		if (wqi >= targetWqi) {
			return {
				needs_recovery: false,
				current_wqi: wqi,
				target_wqi: targetWqi,
				message: 'Water quality is already at target level'
			}
		}

		const wqiGap = targetWqi - wqi
		const recoveryRate = 2.5
		const estimatedHours = Math.ceil(wqiGap / recoveryRate)

		const actions: string[] = []
		if (sensors.DO < 5.0) actions.push('Activate all aerators')
		if (wqi < 40) actions.push('Perform 30% water exchange')

		return {
			needs_recovery: true,
			current_wqi: wqi,
			target_wqi: targetWqi,
			estimated_hours: estimatedHours,
			recovery_rate: recoveryRate,
			required_actions: actions,
			message: `Estimated ${estimatedHours} hours to reach target WQI with proper intervention`
		}
	}

	// Simple status
	const simpleStatus: SimpleStatus = {
		status: wqiClass,
		color: { Good: 'green' as const, Medium: 'yellow' as const, Bad: 'orange' as const, 'Very Bad': 'red' as const }[wqiClass],
		message: {
			Good: 'Water is healthy - shrimp are safe',
			Medium: 'Water is okay but needs attention',
			Bad: 'Water quality is poor - take action',
			'Very Bad': 'CRITICAL - Immediate action required!'
		}[wqiClass]
	}

	// Sensor health (simulated - always healthy in simulation)
	const sensorHealth: SensorHealth = {
		is_healthy: true,
		confidence: 85,
		issues: [],
		recommendation: 'Sensors operating normally (simulated)'
	}

	// Trends (simulated)
	const trends: TrendAnalysis = {
		overall: 'stable',
		parameters: {
			DO: { direction: 'stable', rate: 0.0, quality: 'stable', current: sensors.DO, avg_recent: sensors.DO },
			pH: { direction: 'stable', rate: 0.0, quality: 'stable', current: sensors.pH, avg_recent: sensors.pH },
			Temperature: { direction: 'stable', rate: 0.0, quality: 'stable', current: sensors.Temperature, avg_recent: sensors.Temperature },
		},
		message: 'Water quality is stable'
	}

	// Confidence
	const confidence: ConfidenceScores = {
		sensor_confidence: 85,
		prediction_confidence: 70,
		overall_confidence: 70
	}

	// Generate alerts
	const alerts = []
	if (sensors.DO < OPTIMAL_RANGES.DO.critical_min) {
		alerts.push({
			level: 'critical' as const,
			parameter: 'Dissolved Oxygen',
			message: `CRITICAL: DO at ${sensors.DO} mg/L - Shrimp mortality risk!`,
			action: 'activate_aerator',
			value: sensors.DO,
			farmer_message: 'Turn on ALL aerators NOW!'
		})
	} else if (sensors.DO < OPTIMAL_RANGES.DO.optimal_min) {
		alerts.push({
			level: 'warning' as const,
			parameter: 'Dissolved Oxygen',
			message: `Warning: Low DO at ${sensors.DO} mg/L`,
			action: 'increase_aeration',
			value: sensors.DO,
			farmer_message: 'Oxygen is low. Consider adding more aeration.'
		})
	}

	return {
		timestamp: new Date().toISOString(),
		current: {
			sensors: {
				pH: sensors.pH,
				Temperature: sensors.Temperature,
				DO: sensors.DO,
				Salinity: sensors.Salinity,
				Ammonia: 0.05,
				Nitrite: 0.1,
				Turbidity: 30
			},
			wqi,
			wqi_class: wqiClass,
			status: wqiClass.toLowerCase().replace(' ', '_')
		},
		forecasts: {
			'6h': forecast6h,
			'12h': forecast12h,
			'24h': forecast24h
		},
		predicted_wqi: {
			'6h': { value: computeWQI(forecast6h.pH, forecast6h.Temperature, forecast6h.DO), class: categorizeWQI(computeWQI(forecast6h.pH, forecast6h.Temperature, forecast6h.DO)) },
			'12h': { value: computeWQI(forecast12h.pH, forecast12h.Temperature, forecast12h.DO), class: categorizeWQI(computeWQI(forecast12h.pH, forecast12h.Temperature, forecast12h.DO)) },
			'24h': { value: computeWQI(forecast24h.pH, forecast24h.Temperature, forecast24h.DO), class: categorizeWQI(computeWQI(forecast24h.pH, forecast24h.Temperature, forecast24h.DO)) }
		},
		simple_status: simpleStatus,
		time_to_danger: calculateTimeToDanger(),
		trends,
		night_safety: calculateNightSafety(),
		recovery: calculateRecovery(),
		sensor_health: sensorHealth,
		critical_parameter: alerts.length > 0 ? alerts[0].parameter : null,
		confidence,
		model_agreement: {
			models_used: ['simulation'],
			consensus: true,
			message: 'Using client-side simulation (API not connected)'
		},
		alerts,
		recommendations: [{ 
			type: 'info' as const, 
			title: 'Simulation Mode', 
			description: 'Connect to API for real ML predictions', 
			icon: 'info' 
		}],
		urgency: alerts.some(a => a.level === 'critical') ? 'critical' : alerts.length > 0 ? 'warning' : 'normal',
		model_info: {
			classification_model: 'simulation',
			forecast_models: { '6': 'simulation', '12': 'simulation', '24': 'simulation' }
		}
	}
}
