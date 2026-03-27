export type AlertPriority = 'info' | 'warning' | 'critical'

export type WaterQualityStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'critical'

export type FarmInsight = {
	timestamp: string
	insight_type: string
	priority: AlertPriority
	message: string
	recommendations: string[]
	affected_ponds: number[]
	data: Record<string, unknown>
}

export type ShrimpFarmDashboard = {
	timestamp: string
	overall_health_score: number
	water_quality_summary: Record<string, WaterQualityStatus>
	feed_efficiency: number
	energy_efficiency: number
	labor_efficiency: number
	insights: FarmInsight[]
	alerts: string[]
	recommendations: string[]
}

export type ActionType =
	| 'no_action'
	| 'increase_aeration'
	| 'decrease_aeration'
	| 'water_exchange'
	| 'adjust_feed'
	| 'emergency_response'
	| 'allocate_workers'
	| 'equipment_maintenance'
	| 'monitor_closely'

export type DecisionOutput = {
	timestamp: string
	pond_id: number
	primary_action: ActionType
	action_intensity: number
	secondary_actions: ActionType[]
	priority_rank: number
	urgency_score: number
	recommended_feed_amount: number | null
	recommended_aerator_level: number | null
	recommended_pump_level: number | null
	recommended_heater_level: number | null
	confidence: number
	reasoning: string
	affected_factors: string[]
}

export type MultiPondDecision = {
	timestamp: string
	pond_priorities: Record<string, number>
	urgent_ponds: number[]
	recommended_actions: Record<string, DecisionOutput>
	overall_urgency: number
	resource_allocation: Record<string, number>
}

export type DecisionRecommendation = {
	pond_id: number
	priority_rank: number
	urgency_score: number
	confidence: number
	primary_action: ActionType
	text: string
}

export type WaterQualityData = {
	timestamp: string
	pond_id: number
	ph: number
	temperature: number
	dissolved_oxygen: number
	salinity: number
	ammonia: number
	nitrite: number
	nitrate: number
	turbidity: number
	status: WaterQualityStatus
	alerts: string[]
}

export type FeedData = {
	timestamp: string
	pond_id: number
	shrimp_count: number
	average_weight: number
	feed_amount: number
	feed_type: string
	feeding_frequency: number
	predicted_next_feeding: string
}

export type EnergyData = {
	timestamp: string
	pond_id: number
	aerator_usage: number
	pump_usage: number
	heater_usage: number
	total_energy: number
	cost: number
	efficiency_score: number
}

export type LaborData = {
	timestamp: string
	pond_id: number
	tasks_completed: string[]
	time_spent: number
	worker_count: number
	efficiency_score: number
	next_tasks: string[]
}

export type DashboardApiResponse = {
	dashboard: ShrimpFarmDashboard
	water_quality: WaterQualityData[]
	feed: FeedData[]
	energy: EnergyData[]
	labor: LaborData[]
	decision_agent_type?: string | null
	decisions?: MultiPondDecision | null
	decision_recommendations?: DecisionRecommendation[]
}

export type SavedWaterQuality = {
	pond_id: number
	ph: number
	temperature: number
	dissolved_oxygen: number
	salinity: number
	status: WaterQualityStatus
	alerts: string[]
}

export type SavedFeed = {
	pond_id: number
	shrimp_count: number
	average_weight: number
	feed_amount: number
	feed_type: string
	feeding_frequency: number
}

export type SavedEnergy = {
	pond_id: number
	total_energy: number
	cost: number
	efficiency_score: number
}

export type SavedLabor = {
	pond_id: number
	tasks_completed: string[]
	time_spent: number
	worker_count: number
	efficiency_score: number
}

export type SavedFarmSnapshot = {
	source?: string
	timestamp: string
	water_quality: SavedWaterQuality[]
	feed: SavedFeed[]
	energy: SavedEnergy[]
	labor: SavedLabor[]
}

export type HistoryApiResponse = {
	count: number
	items: SavedFarmSnapshot[]
}

export type WQIClass = 'Good' | 'Medium' | 'Bad' | 'Very Bad'

export type AlertLevel = 'critical' | 'warning' | 'info'

export type PredictionAlert = {
	level: AlertLevel
	parameter: string
	message: string
	action: string
	value: number
	threshold?: number
	farmer_message?: string
}

export type PredictionRecommendation = {
	type: 'info' | 'warning' | 'action' | 'critical'
	title: string
	description: string
	icon: string
	priority?: number
}

export type SensorReadings = {
	pH: number
	Temperature: number
	DO: number
	Salinity: number
	Ammonia: number
	Nitrite: number
	Turbidity: number
}

export type ForecastValues = {
	pH: number
	DO: number
	Temperature: number
	Salinity: number
}

export type PredictedWQI = {
	value: number
	class: WQIClass
}

export type SimpleStatus = {
	status: WQIClass
	color: 'green' | 'yellow' | 'orange' | 'red' | 'gray'
	message: string
}

export type TimeToDanger = {
	is_safe: boolean
	hours_remaining: number | null
	critical_parameter: string | null
	danger_type: 'critical_low' | 'critical_high' | 'out_of_range' | 'already_critical' | null
	message: string
	urgency: 'normal' | 'warning' | 'critical'
}

export type TrendDirection = 'increasing' | 'decreasing' | 'stable'
export type TrendQuality = 'improving' | 'stable' | 'deteriorating' | 'changing' | 'unstable'

export type ParameterTrend = {
	direction: TrendDirection
	rate: number
	quality: TrendQuality
	current: number
	avg_recent: number
}

export type TrendAnalysis = {
	overall: 'improving' | 'stable' | 'deteriorating' | 'insufficient_data'
	parameters: Record<string, ParameterTrend>
	message: string
}

export type NightSafety = {
	current_do: number
	predicted_night_do: number
	is_night_safe: boolean
	safety_margin: number
	risk_level: 'safe' | 'warning' | 'critical'
	recommendation: {
		aerator_setting: 'normal' | 'moderate' | 'high' | 'maximum'
		message: string
	}
}

export type RecoveryPrediction = {
	needs_recovery: boolean
	current_wqi: number
	target_wqi: number
	estimated_hours?: number
	recovery_rate?: number
	required_actions?: string[]
	message: string
}

export type SensorHealthIssue = {
	parameter: string
	type: 'impossible_value' | 'sudden_change' | 'calibration_drift'
	message: string
	change?: number
}

export type SensorHealth = {
	is_healthy: boolean
	confidence: number
	issues: SensorHealthIssue[]
	recommendation: string
}

export type ConfidenceScores = {
	sensor_confidence: number
	prediction_confidence: number
	overall_confidence: number
}

export type ModelAgreement = {
	models_used: string[]
	consensus: boolean
	message: string
}

export type MLClassificationResult = {
	ml_class: WQIClass
	ml_confidence: number
	ml_probabilities: Record<string, number>
	model_used: string
	model_type: 'random_forest' | 'mlp' | 'rule_based' | string
	wqi_score: number
	wqi_class?: WQIClass
	using_trained_model: boolean
	features_used?: number
	input_sensors?: SensorReadings
	error?: string
	timestamp?: string
	alerts?: PredictionAlert[]
	recommendation?: {
		action: 'maintain' | 'monitor' | 'intervene' | 'emergency' | 'unknown'
		message: string
	}
}

export type PredictionResponse = {
	timestamp: string
	pond_id?: number
	current: {
		sensors: SensorReadings
		wqi: number
		wqi_class: WQIClass
		status: string
	}
	forecasts: {
		'6h': ForecastValues
		'12h': ForecastValues
		'24h': ForecastValues
	}
	predicted_wqi: {
		'6h': PredictedWQI
		'12h': PredictedWQI
		'24h': PredictedWQI
	}
	simple_status: SimpleStatus
	time_to_danger: TimeToDanger
	trends: TrendAnalysis
	night_safety: NightSafety
	recovery: RecoveryPrediction
	sensor_health: SensorHealth
	critical_parameter: string | null
	confidence: ConfidenceScores
	model_agreement: ModelAgreement
	alerts: PredictionAlert[]
	recommendations: PredictionRecommendation[]
	urgency: 'normal' | 'warning' | 'critical'
	ml_classification?: MLClassificationResult
	model_info: {
		classification_model: string
		classification_confidence?: number
		using_trained_model?: boolean
		forecast_models: Record<string, string>
	}
}

export type BatchPondResult = {
	pond_id: number
	sensors: SensorReadings
	wqi: number
	wqi_class: WQIClass
	simple_status: SimpleStatus
	forecasts: { '6h': ForecastValues; '12h': ForecastValues; '24h': ForecastValues }
	time_to_danger: TimeToDanger
	trends: TrendAnalysis
	night_safety: NightSafety
	alerts: PredictionAlert[]
	alert_count: number
	critical_count: number
}

export type BatchPredictionResponse = {
	timestamp: string
	pond_count: number
	results: BatchPondResult[]
	summary: {
		total_alerts: number
		critical_ponds: number
		average_wqi: number
		farm_status: 'healthy' | 'warning' | 'critical'
		farm_message: string
	}
}

export type TriggerType = 'threshold' | 'prediction' | 'manual' | 'safety'

export type HardwareType = 'aerator' | 'oxygen_pump' | 'water_pump' | 'heater' | 'feeder'

export type HardwareStatus = 'online' | 'offline' | 'running' | 'standby' | 'error' | 'maintenance'

export type TriggerPriority = 'low' | 'medium' | 'high' | 'critical'

export type HardwareDevice = {
	id: string
	type: HardwareType
	name: string
	pond_id: number
	status: HardwareStatus
	power_level: number
	is_manual_override: boolean
	last_triggered: string | null
	esp32_ip: string
	firmware_version: string
	online: boolean
}

export type TriggerThreshold = {
	parameter: 'DO' | 'pH' | 'Temperature' | 'Salinity' | 'Ammonia'
	min_value: number
	max_value: number
	critical_min: number
	critical_max: number
	unit: string
}

export type TriggerConfig = {
	id: string
	name: string
	enabled: boolean
	pond_id: number | 'all'
	trigger_type: TriggerType
	thresholds: TriggerThreshold[]
	target_devices: string[]
	prediction_hours_ahead: number
	cooldown_seconds: number
	confirmation_readings: number
	auto_shutoff_minutes: number
	priority: TriggerPriority
}

export type TriggerEvent = {
	id: string
	timestamp: string
	trigger_config_id: string
	trigger_type: TriggerType
	pond_id: number
	parameter: string
	value: number
	threshold: number
	action_taken: 'activated' | 'deactivated' | 'increased' | 'decreased' | 'blocked' | 'manual_override'
	devices_affected: string[]
	priority: TriggerPriority
	was_prediction_based: boolean
	prediction_horizon?: string
	confirmed: boolean
	blocked_reason?: string
	user_acknowledged: boolean
	notes?: string
}

export type SafetyCheck = {
	name: string
	passed: boolean
	message: string
	check_type: 'sensor_validation' | 'rate_limit' | 'device_health' | 'confirmation' | 'time_based'
}

export type TriggerDecision = {
	should_trigger: boolean
	trigger_type: TriggerType
	priority: TriggerPriority
	devices_to_activate: string[]
	power_level: number
	safety_checks: SafetyCheck[]
	all_checks_passed: boolean
	blocked_reason?: string
	reasoning: string
}

export type AutoTriggerSystemStatus = {
	enabled: boolean
	last_check: string
	next_check: string
	check_interval_seconds: number
	active_triggers: TriggerEvent[]
	pending_triggers: TriggerDecision[]
	devices: HardwareDevice[]
	configs: TriggerConfig[]
	recent_events: TriggerEvent[]
	system_health: 'healthy' | 'warning' | 'error'
	esp32_connection: 'connected' | 'disconnected' | 'reconnecting'
}

export type ManualOverride = {
	device_id: string
	enabled: boolean
	power_level: number
	started_at: string
	expires_at: string | null
	reason: string
	user_id: string
}
