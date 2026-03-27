import { useEffect, useState, useCallback, useMemo } from 'react'
import type { 
	PredictionResponse, WaterQualityData, WQIClass, 
	PredictionAlert, PredictionRecommendation,
	TimeToDanger, TrendAnalysis, NightSafety, RecoveryPrediction
} from '../lib/types'
import { formatNumber } from '../lib/format'
import { simulatePrediction } from '../lib/usePrediction'

type Props = {
	waterQuality: WaterQualityData[]
	pondFilter: number | null
}

const API_BASE = 'http://localhost:5001'

export function AIPredictionsPanel({ waterQuality, pondFilter }: Props) {
	const [predictions, setPredictions] = useState<Map<number, PredictionResponse>>(new Map())
	const [loading, setLoading] = useState(false)
	const [apiAvailable, setApiAvailable] = useState(true)
	const [selectedHorizon, setSelectedHorizon] = useState<'6h' | '12h' | '24h'>('6h')
	const [selectedPond, setSelectedPond] = useState<number | null>(null)

	const filteredWaterQuality = useMemo(() => {
		return pondFilter ? waterQuality.filter(w => w.pond_id === pondFilter) : waterQuality
	}, [waterQuality, pondFilter])

	const fetchPredictions = useCallback(async () => {
		if (filteredWaterQuality.length === 0) return

		setLoading(true)
		const newPredictions = new Map<number, PredictionResponse>()

		for (const wq of filteredWaterQuality) {
			try {
				if (apiAvailable) {
					const response = await fetch(`${API_BASE}/api/predict`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							pond_id: wq.pond_id,
							pH: wq.ph,
							Temperature: wq.temperature,
							DO: wq.dissolved_oxygen,
							Salinity: wq.salinity,
							Ammonia: wq.ammonia || 0.05,
							Nitrite: wq.nitrite || 0.1,
							Turbidity: wq.turbidity || 30
						})
					})

					if (!response.ok) throw new Error('API error')
					const data = await response.json()
					newPredictions.set(wq.pond_id, data)
				} else {
					throw new Error('API not available')
				}
			} catch {
				setApiAvailable(false)
				const simulated = simulatePrediction({
					pH: wq.ph,
					Temperature: wq.temperature,
					DO: wq.dissolved_oxygen,
					Salinity: wq.salinity
				})
				newPredictions.set(wq.pond_id, simulated)
			}
		}

		setPredictions(newPredictions)
		setLoading(false)
		
		// Auto-select first pond if none selected
		if (selectedPond === null && newPredictions.size > 0) {
			setSelectedPond(Array.from(newPredictions.keys())[0])
		}
	}, [filteredWaterQuality, apiAvailable, selectedPond])

	useEffect(() => {
		fetchPredictions()
		const interval = setInterval(fetchPredictions, 30000)
		return () => clearInterval(interval)
	}, [fetchPredictions])

	// Get currently selected pond's prediction
	const currentPrediction = selectedPond !== null ? predictions.get(selectedPond) : null

	// Aggregate stats
	const aggregateStats = useMemo(() => {
		const allPreds = Array.from(predictions.values())
		if (allPreds.length === 0) return null

		const avgWQI = allPreds.reduce((sum, p) => sum + p.current.wqi, 0) / allPreds.length
		const criticalCount = allPreds.filter(p => p.urgency === 'critical').length
		const warningCount = allPreds.filter(p => p.urgency === 'warning').length
		const allAlerts = allPreds.flatMap(p => p.alerts)
		const unsafePonds = allPreds.filter(p => !p.time_to_danger?.is_safe).length

		return { avgWQI, criticalCount, warningCount, allAlerts, total: allPreds.length, unsafePonds }
	}, [predictions])

	// Helper functions for styling
	const getWQIColor = (wqiClass: WQIClass) => {
		switch (wqiClass) {
			case 'Good': return 'var(--good)'
			case 'Medium': return 'var(--info)'
			case 'Bad': return 'var(--warn)'
			case 'Very Bad': return 'var(--bad)'
		}
	}

	const getWQIBg = (wqiClass: WQIClass) => {
		switch (wqiClass) {
			case 'Good': return 'rgba(22, 163, 74, 0.1)'
			case 'Medium': return 'rgba(37, 99, 235, 0.1)'
			case 'Bad': return 'rgba(217, 119, 6, 0.1)'
			case 'Very Bad': return 'rgba(220, 38, 38, 0.1)'
		}
	}

	if (filteredWaterQuality.length === 0) {
		return (
			<div className="aiPanel">
				<div className="aiPanelHeader">
					<div className="aiPanelTitle">AI Water Quality Predictions</div>
				</div>
				<div className="emptyState">No water quality data available for predictions</div>
			</div>
		)
	}

	return (
		<div className="aiPanel">
			{/* Header */}
			<div className="aiPanelHeader">
				<div className="aiPanelTitle">
					<span className="aiIconBox">AI</span>
					<div>
						<h2>AI-Powered Water Quality Intelligence</h2>
						<span className="aiSubtitle">
							<span className={`statusDot ${apiAvailable ? 'online' : 'offline'}`}></span>
							{apiAvailable ? 'Connected to ML Backend' : 'Using Client Simulation'}
							{loading && ' - Updating...'}
						</span>
					</div>
				</div>
				<div className="aiControls">
					<div className="horizonSelector">
						{(['6h', '12h', '24h'] as const).map(h => (
							<button
								key={h}
								className={`horizonBtn ${selectedHorizon === h ? 'active' : ''}`}
								onClick={() => setSelectedHorizon(h)}
							>
								{h}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Farm Overview Summary */}
			{aggregateStats && (
				<div className="farmSummary">
					<div className="summaryCard wqiSummary">
						<div className="summaryIconBox wqi">WQI</div>
						<div className="summaryContent">
							<div className="summaryLabel">Farm Average WQI</div>
							<div className="summaryValue">{formatNumber(aggregateStats.avgWQI, { maximumFractionDigits: 0 })}</div>
						</div>
					</div>
					<div className="summaryCard alertsSummary">
						<div className="summaryIconBox alerts">!</div>
						<div className="summaryContent">
							<div className="summaryLabel">Active Alerts</div>
							<div className="summaryValue">{aggregateStats.allAlerts.length}</div>
							{aggregateStats.criticalCount > 0 && (
								<span className="criticalBadge">{aggregateStats.criticalCount} critical</span>
							)}
						</div>
					</div>
					<div className="summaryCard unsafeSummary">
						<div className="summaryIconBox risk">R</div>
						<div className="summaryContent">
							<div className="summaryLabel">Ponds at Risk</div>
							<div className="summaryValue">{aggregateStats.unsafePonds} / {aggregateStats.total}</div>
						</div>
					</div>
					<div className="summaryCard confidenceSummary">
						<div className="summaryIconBox confidence">%</div>
						<div className="summaryContent">
							<div className="summaryLabel">Prediction Confidence</div>
							<div className="summaryValue">{apiAvailable ? '85%' : '70%'}</div>
						</div>
					</div>
				</div>
			)}

			{/* Pond Selector Tabs */}
			{predictions.size > 1 && (
				<div className="pondTabs">
					{Array.from(predictions.entries()).map(([pondId, pred]) => (
						<button
							key={pondId}
							className={`pondTab ${selectedPond === pondId ? 'active' : ''}`}
							onClick={() => setSelectedPond(pondId)}
							style={{ borderColor: getWQIColor(pred.current.wqi_class) }}
						>
							<span className="pondTabName">Pond {pondId}</span>
							<span 
								className="pondTabStatus" 
								style={{ backgroundColor: getWQIBg(pred.current.wqi_class), color: getWQIColor(pred.current.wqi_class) }}
							>
								{pred.current.wqi_class}
							</span>
						</button>
					))}
				</div>
			)}

			{/* Main Prediction Content */}
			{currentPrediction && (
				<div className="predictionContent">
					{/* Row 1: Simple Status + Time to Danger + Night Safety */}
					<div className="predictionRow topRow">
						{/* Simple Status Card - THE MOST IMPORTANT */}
						<div 
							className="statusCard mainStatus"
							style={{ 
								backgroundColor: getWQIBg(currentPrediction.current.wqi_class),
								borderColor: getWQIColor(currentPrediction.current.wqi_class)
							}}
						>
							<div className="statusHeader">
								<span className="statusLabel">Pond Health Status</span>
								<span 
									className="statusBadge"
									style={{ backgroundColor: getWQIColor(currentPrediction.current.wqi_class) }}
								>
									{currentPrediction.current.wqi_class}
								</span>
							</div>
							<div className="statusMessage">
								{currentPrediction.simple_status?.message || 'Analyzing water quality...'}
							</div>
							<div className="wqiDisplay">
								<span className="wqiNumber">{formatNumber(currentPrediction.current.wqi, { maximumFractionDigits: 0 })}</span>
								<span className="wqiLabel">WQI Score</span>
							</div>
						</div>

						{/* Time to Danger Card */}
						<TimeToDangerCard timeToDanger={currentPrediction.time_to_danger} />

						{/* Night Safety Card */}
						<NightSafetyCard nightSafety={currentPrediction.night_safety} />
					</div>

					{/* Row 2: Forecast Table */}
					<div className="predictionRow">
						<div className="forecastCard">
							<div className="forecastHeader">
								<h3>Parameter Forecasts</h3>
								<span className="forecastHorizon">Prediction: {selectedHorizon}</span>
							</div>
							<ForecastTable 
								current={currentPrediction.current.sensors}
								forecast={currentPrediction.forecasts[selectedHorizon]}
								predictedWqi={currentPrediction.predicted_wqi[selectedHorizon]}
							/>
						</div>
					</div>

					{/* Row 3: Trends + Recovery */}
					<div className="predictionRow">
						<TrendsCard trends={currentPrediction.trends} />
						<RecoveryCard recovery={currentPrediction.recovery} />
					</div>

					{/* Row 4: Alerts */}
					{currentPrediction.alerts.length > 0 && (
						<div className="predictionRow">
							<div className="alertsCard">
								<h3>Active Alerts</h3>
								<div className="alertsList">
									{currentPrediction.alerts.map((alert, idx) => (
										<AlertItem key={idx} alert={alert} />
									))}
								</div>
							</div>
						</div>
					)}

					{/* Row 5: Recommendations */}
					<div className="predictionRow">
						<div className="recommendationsCard">
							<h3>AI Recommendations</h3>
							<div className="recommendationsGrid">
								{currentPrediction.recommendations.slice(0, 4).map((rec, idx) => (
									<RecommendationCard key={idx} recommendation={rec} />
								))}
							</div>
						</div>
					</div>

					{/* Row 6: Sensor Health + Model Info */}
					<div className="predictionRow bottomRow">
						<SensorHealthCard sensorHealth={currentPrediction.sensor_health} />
						<ConfidenceCard 
							confidence={currentPrediction.confidence} 
							modelAgreement={currentPrediction.model_agreement}
						/>
					</div>
				</div>
			)}
		</div>
	)
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function TimeToDangerCard({ timeToDanger }: { timeToDanger?: TimeToDanger }) {
	if (!timeToDanger) return null

	const bgColor = timeToDanger.is_safe 
		? 'rgba(22, 163, 74, 0.1)' 
		: timeToDanger.urgency === 'critical' 
		? 'rgba(220, 38, 38, 0.1)' 
		: 'rgba(217, 119, 6, 0.1)'

	const borderColor = timeToDanger.is_safe 
		? 'var(--good)' 
		: timeToDanger.urgency === 'critical' 
		? 'var(--bad)' 
		: 'var(--warn)'

	return (
		<div className="statusCard dangerCard" style={{ backgroundColor: bgColor, borderColor }}>
			<div className="statusHeader">
				<span className="statusLabel">Time to Danger</span>
			</div>
			{timeToDanger.is_safe ? (
				<>
					<div className="safeMessage"><span className="checkIcon"></span>Safe for 24+ hours</div>
					<div className="safeSubtext">No critical conditions predicted</div>
				</>
			) : (
				<>
					<div className="dangerTime">
						{timeToDanger.hours_remaining === 0 ? (
							<span className="dangerNow">NOW!</span>
						) : (
							<>
								<span className="dangerHours">{timeToDanger.hours_remaining}</span>
								<span className="dangerUnit">hours</span>
							</>
						)}
					</div>
					<div className="dangerParam">{timeToDanger.critical_parameter}</div>
					<div className="dangerMessage">{timeToDanger.message}</div>
				</>
			)}
		</div>
	)
}

function NightSafetyCard({ nightSafety }: { nightSafety?: NightSafety }) {
	if (!nightSafety) return null

	const riskColors = {
		safe: { bg: 'rgba(22, 163, 74, 0.1)', border: 'var(--good)' },
		warning: { bg: 'rgba(217, 119, 6, 0.1)', border: 'var(--warn)' },
		critical: { bg: 'rgba(220, 38, 38, 0.1)', border: 'var(--bad)' }
	}

	const colors = riskColors[nightSafety.risk_level]

	return (
		<div className="statusCard nightCard" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
			<div className="statusHeader">
				<span className="statusLabel">Night Safety</span>
			</div>
			<div className="nightDOPreview">
				<div className="nightDOCurrent">
					<span className="nightDOLabel">Current DO</span>
					<span className="nightDOValue">{nightSafety.current_do.toFixed(1)} mg/L</span>
				</div>
				<span className="nightDOArrow">&rarr;</span>
				<div className="nightDOPredicted">
					<span className="nightDOLabel">Night (Est.)</span>
					<span className="nightDOValue" style={{ color: colors.border }}>
						{nightSafety.predicted_night_do.toFixed(1)} mg/L
					</span>
				</div>
			</div>
			<div className="nightRecommendation">
				<span className="aeratorLabel">Aerator: </span>
				<span className="aeratorValue">{nightSafety.recommendation.aerator_setting.toUpperCase()}</span>
			</div>
		</div>
	)
}

function ForecastTable({ current, forecast, predictedWqi }: { 
	current: { pH: number; Temperature: number; DO: number; Salinity: number };
	forecast: { pH: number; DO: number; Temperature: number; Salinity: number };
	predictedWqi: { value: number; class: WQIClass };
}) {
	const params = [
		{ key: 'DO', label: 'Dissolved Oxygen', unit: 'mg/L', optimal: '5-8' },
		{ key: 'pH', label: 'pH Level', unit: '', optimal: '7.5-8.5' },
		{ key: 'Temperature', label: 'Temperature', unit: '°C', optimal: '26-30' },
		{ key: 'Salinity', label: 'Salinity', unit: 'ppt', optimal: '15-25' },
	]

	const getTrendColor = (param: string, curr: number, pred: number) => {
		const diff = pred - curr
		if (Math.abs(diff) < 0.1) return 'var(--muted)'
		if (param === 'DO') return diff > 0 ? 'var(--good)' : 'var(--bad)'
		return 'var(--muted)'
	}

	const getTrendIcon = (curr: number, pred: number) => {
		const diff = pred - curr
		if (Math.abs(diff) < 0.1) return '-'
		return diff > 0 ? '+' : '-'
	}

	return (
		<div className="forecastTableWrapper">
			<table className="forecastTable">
				<thead>
					<tr>
						<th>Parameter</th>
						<th>Current</th>
						<th>Predicted</th>
						<th>Trend</th>
						<th>Optimal</th>
					</tr>
				</thead>
				<tbody>
					{params.map(p => {
						const currVal = current[p.key as keyof typeof current]
						const predVal = forecast[p.key as keyof typeof forecast]
						return (
							<tr key={p.key}>
								<td className="paramName">{p.label}</td>
								<td className="paramValue">{currVal?.toFixed(p.key === 'pH' ? 2 : 1)} {p.unit}</td>
								<td className="paramValue">{predVal?.toFixed(p.key === 'pH' ? 2 : 1)} {p.unit}</td>
								<td className="paramTrend" style={{ color: getTrendColor(p.key, currVal, predVal) }}>
									{getTrendIcon(currVal, predVal)}
								</td>
								<td className="paramOptimal">{p.optimal}</td>
							</tr>
						)
					})}
				</tbody>
			</table>
			<div className="predictedWqiRow">
				<span>Predicted WQI:</span>
				<span 
					className="predictedWqiBadge"
					style={{ 
						backgroundColor: predictedWqi.class === 'Good' ? 'rgba(22, 163, 74, 0.2)' : 
						                 predictedWqi.class === 'Medium' ? 'rgba(37, 99, 235, 0.2)' :
						                 predictedWqi.class === 'Bad' ? 'rgba(217, 119, 6, 0.2)' : 'rgba(220, 38, 38, 0.2)'
					}}
				>
					{predictedWqi.value.toFixed(0)} ({predictedWqi.class})
				</span>
			</div>
		</div>
	)
}

function TrendsCard({ trends }: { trends?: TrendAnalysis }) {
	if (!trends) return null

	const overallColors = {
		improving: { bg: 'rgba(22, 163, 74, 0.1)', text: 'var(--good)' },
		stable: { bg: 'rgba(37, 99, 235, 0.1)', text: 'var(--info)' },
		deteriorating: { bg: 'rgba(220, 38, 38, 0.1)', text: 'var(--bad)' },
		insufficient_data: { bg: 'rgba(107, 114, 128, 0.1)', text: 'var(--muted)' }
	}

	const colors = overallColors[trends.overall]

	return (
		<div className="trendCard" style={{ backgroundColor: colors.bg }}>
			<div className="trendHeader">
				<h3>Trend Analysis</h3>
				<span className="overallTrend" style={{ color: colors.text }}>
					{trends.overall.charAt(0).toUpperCase() + trends.overall.slice(1)}
				</span>
			</div>
			<div className="trendMessage">{trends.message}</div>
			{Object.keys(trends.parameters).length > 0 && (
				<div className="paramTrends">
					{Object.entries(trends.parameters).slice(0, 4).map(([param, trend]) => (
						<div key={param} className="paramTrendItem">
							<span className="paramTrendName">{param}</span>
							<span className="paramTrendDirection">
								{trend.direction === 'increasing' ? 'UP' : trend.direction === 'decreasing' ? 'DN' : '--'}
							</span>
							<span className={`paramTrendQuality ${trend.quality}`}>{trend.quality}</span>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

function RecoveryCard({ recovery }: { recovery?: RecoveryPrediction }) {
	if (!recovery) return null

	if (!recovery.needs_recovery) {
		return (
			<div className="recoveryCard healthy">
				<h3>Recovery Status</h3>
				<div className="recoveryMessage"><span className="checkIcon"></span>No recovery needed - water quality is good!</div>
			</div>
		)
	}

	return (
		<div className="recoveryCard needsRecovery">
			<h3>Recovery Prediction</h3>
			<div className="recoveryTime">
				<span className="recoveryHours">{recovery.estimated_hours}</span>
				<span className="recoveryUnit">hours to target WQI</span>
			</div>
			<div className="recoveryProgress">
				<div className="progressBar">
					<div 
						className="progressFill" 
						style={{ width: `${(recovery.current_wqi / recovery.target_wqi) * 100}%` }}
					></div>
				</div>
				<div className="progressLabels">
					<span>Current: {recovery.current_wqi.toFixed(0)}</span>
					<span>Target: {recovery.target_wqi}</span>
				</div>
			</div>
			{recovery.required_actions && recovery.required_actions.length > 0 && (
				<div className="recoveryActions">
					<span className="actionsLabel">Required actions:</span>
					<ul>
						{recovery.required_actions.map((action, i) => (
							<li key={i}>{action}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	)
}

function AlertItem({ alert }: { alert: PredictionAlert }) {
	const bgColor = alert.level === 'critical' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(217, 119, 6, 0.1)'
	const borderColor = alert.level === 'critical' ? 'var(--bad)' : 'var(--warn)'

	return (
		<div className="alertItem" style={{ backgroundColor: bgColor, borderLeftColor: borderColor }}>
			<span className={`alertIconBox ${alert.level}`}>{alert.level === 'critical' ? '!' : '!'}</span>
			<div className="alertContent">
				<div className="alertTitle">{alert.parameter}</div>
				<div className="alertMessage">{alert.farmer_message || alert.message}</div>
			</div>
			<div className="alertValue">{alert.value?.toFixed(2) || '—'}</div>
		</div>
	)
}

function RecommendationCard({ recommendation }: { recommendation: PredictionRecommendation }) {
	const bgColors: Record<string, string> = {
		info: 'rgba(37, 99, 235, 0.08)',
		warning: 'rgba(217, 119, 6, 0.08)',
		action: 'rgba(22, 163, 74, 0.08)',
		critical: 'rgba(220, 38, 38, 0.08)'
	}

	return (
		<div className="recCard" style={{ backgroundColor: bgColors[recommendation.type] || bgColors.info }}>
			<div className={`recIconBox ${recommendation.type}`} />
			<div className="recContent">
				<div className="recTitle">{recommendation.title}</div>
				<div className="recDescription">{recommendation.description}</div>
			</div>
		</div>
	)
}

function SensorHealthCard({ sensorHealth }: { sensorHealth?: { is_healthy: boolean; confidence: number; issues: Array<{ parameter: string; message: string }>; recommendation: string } }) {
	if (!sensorHealth) return null

	return (
		<div className={`sensorHealthCard ${sensorHealth.is_healthy ? 'healthy' : 'issues'}`}>
			<h3>Sensor Health</h3>
			<div className="healthStatus">
				{sensorHealth.is_healthy ? (
					<span className="healthGood"><span className="checkIcon"></span>All sensors operating normally</span>
				) : (
					<span className="healthBad"><span className="warnIcon"></span>{sensorHealth.issues.length} issue(s) detected</span>
				)}
			</div>
			<div className="confidenceMeter">
				<span>Sensor Confidence:</span>
				<div className="confidenceBar">
					<div 
						className="confidenceFill" 
						style={{ width: `${sensorHealth.confidence}%` }}
					></div>
				</div>
				<span>{sensorHealth.confidence}%</span>
			</div>
			{sensorHealth.issues.length > 0 && (
				<div className="sensorIssues">
					{sensorHealth.issues.map((issue, i) => (
						<div key={i} className="sensorIssue">
							{issue.parameter}: {issue.message}
						</div>
					))}
				</div>
			)}
		</div>
	)
}

function ConfidenceCard({ confidence, modelAgreement }: { 
	confidence?: { sensor_confidence: number; prediction_confidence: number; overall_confidence: number };
	modelAgreement?: { models_used: string[]; consensus: boolean; message: string };
}) {
	if (!confidence || !modelAgreement) return null

	return (
		<div className="confidenceCard">
			<h3>Prediction Confidence</h3>
			<div className="confidenceScores">
				<div className="scoreItem">
					<span className="scoreLabel">Overall</span>
					<span className="scoreValue">{confidence.overall_confidence}%</span>
				</div>
				<div className="scoreItem">
					<span className="scoreLabel">Sensors</span>
					<span className="scoreValue">{confidence.sensor_confidence}%</span>
				</div>
				<div className="scoreItem">
					<span className="scoreLabel">Models</span>
					<span className="scoreValue">{confidence.prediction_confidence}%</span>
				</div>
			</div>
			<div className="modelInfo">
				<span className={`consensusBadge ${modelAgreement.consensus ? 'agree' : 'disagree'}`}>
					{modelAgreement.consensus ? 'Models Agree' : 'Models Disagree'}
				</span>
				<span className="modelMessage">{modelAgreement.message}</span>
			</div>
		</div>
	)
}
