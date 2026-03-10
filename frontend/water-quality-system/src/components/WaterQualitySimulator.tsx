import { useEffect, useState } from 'react'
import { usePrediction } from '../lib/usePrediction'
import type { PredictionResponse, MLClassificationResult, WQIClass } from '../lib/types'
import { formatNumber } from '../lib/format'

type Props = {
	defaultPh: number
	defaultTemperature: number
	defaultDo: number
	defaultSalinity: number
}

const getClassColor = (wqiClass: WQIClass | string | undefined) => {
	switch (wqiClass) {
		case 'Good': return { bg: 'rgba(22, 163, 74, 0.15)', border: '#16a34a', text: '#15803d' }
		case 'Medium': return { bg: 'rgba(37, 99, 235, 0.15)', border: '#2563eb', text: '#1d4ed8' }
		case 'Bad': return { bg: 'rgba(217, 119, 6, 0.15)', border: '#d97706', text: '#b45309' }
		case 'Very Bad': return { bg: 'rgba(220, 38, 38, 0.15)', border: '#dc2626', text: '#b91c1c' }
		default: return { bg: 'rgba(148, 163, 184, 0.15)', border: '#94a3b8', text: '#64748b' }
	}
}

const getModelIcon = (modelType: string | undefined) => {
	if (modelType?.includes('random_forest')) return 'RF'
	if (modelType?.includes('mlp')) return 'NN'
	return 'ML'
}

export function WaterQualitySimulator({ defaultPh, defaultTemperature, defaultDo, defaultSalinity }: Props) {
	const [ph, setPh] = useState<number>(defaultPh || 7.8)
	const [temperature, setTemperature] = useState<number>(defaultTemperature || 28)
	const [doVal, setDoVal] = useState<number>(defaultDo || 6.5)
	const [salinity, setSalinity] = useState<number>(defaultSalinity || 20)

	const { loading, error, predict } = usePrediction()
	const [lastResult, setLastResult] = useState<PredictionResponse | null>(null)

	// Sync defaults when pond filter changes
	useEffect(() => {
		if (!lastResult) {
			setPh(defaultPh || 7.8)
			setTemperature(defaultTemperature || 28)
			setDoVal(defaultDo || 6.5)
			setSalinity(defaultSalinity || 20)
		}
	}, [defaultPh, defaultTemperature, defaultDo, defaultSalinity, lastResult])

	const handleRun = async () => {
		const result = await predict({
			pH: ph,
			Temperature: temperature,
			DO: doVal,
			Salinity: salinity
		})
		if (result) setLastResult(result)
	}

	const handleReset = () => {
		setPh(defaultPh || 7.8)
		setTemperature(defaultTemperature || 28)
		setDoVal(defaultDo || 6.5)
		setSalinity(defaultSalinity || 20)
		setLastResult(null)
	}

	const current = lastResult?.current
	const mlResult = lastResult?.ml_classification as MLClassificationResult | undefined
	const modelInfo = lastResult?.model_info
	const simpleStatus = lastResult?.simple_status
	const alerts = lastResult?.alerts || []

	const classColors = getClassColor(mlResult?.ml_class || current?.wqi_class)

	return (
		<div className="panel spanAll">
			<div className="panelHeader">
				<div className="panelTitle">
					<span style={{ marginRight: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', borderRadius: 6, color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>SIM</span>
					Water Quality Simulator (What-if Analysis)
				</div>
				<div className="panelRight">
					<span className="muted">Adjust parameters and run ML prediction</span>
				</div>
			</div>

			{/* Slider Controls */}
			<div style={{ padding: '16px 0' }}>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
					{/* pH Slider */}
					<div className="valueCard" style={{ padding: 16 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
							<div className="valueTitle">pH Level</div>
							<div className={`valueBadge ${ph >= 7.5 && ph <= 8.5 ? 'good' : 'warn'}`}>
								{ph >= 7.5 && ph <= 8.5 ? 'Optimal' : 'Check'}
							</div>
						</div>
						<div className="valueMain" style={{ marginBottom: 12 }}>
							<span className="valueNumber mono" style={{ fontSize: '1.8rem' }}>
								{formatNumber(ph, { maximumFractionDigits: 2 })}
							</span>
						</div>
						<input
							type="range"
							min={6.0}
							max={9.5}
							step={0.1}
							value={ph}
							onChange={(e) => setPh(parseFloat(e.target.value))}
							style={{ width: '100%', accentColor: ph >= 7.5 && ph <= 8.5 ? '#16a34a' : '#d97706' }}
						/>
						<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
							<span className="muted" style={{ fontSize: '0.75rem' }}>6.0</span>
							<span className="muted" style={{ fontSize: '0.75rem' }}>Optimal: 7.5–8.5</span>
							<span className="muted" style={{ fontSize: '0.75rem' }}>9.5</span>
						</div>
					</div>

					{/* Temperature Slider */}
					<div className="valueCard" style={{ padding: 16 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
							<div className="valueTitle">Temperature</div>
							<div className={`valueBadge ${temperature >= 26 && temperature <= 30 ? 'good' : 'warn'}`}>
								{temperature >= 26 && temperature <= 30 ? 'Optimal' : 'Check'}
							</div>
						</div>
						<div className="valueMain" style={{ marginBottom: 12 }}>
							<span className="valueNumber mono" style={{ fontSize: '1.8rem' }}>
								{formatNumber(temperature, { maximumFractionDigits: 1 })}
							</span>
							<span className="valueUnit">°C</span>
						</div>
						<input
							type="range"
							min={20}
							max={35}
							step={0.5}
							value={temperature}
							onChange={(e) => setTemperature(parseFloat(e.target.value))}
							style={{ width: '100%', accentColor: temperature >= 26 && temperature <= 30 ? '#16a34a' : '#d97706' }}
						/>
						<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
							<span className="muted" style={{ fontSize: '0.75rem' }}>20°C</span>
							<span className="muted" style={{ fontSize: '0.75rem' }}>Optimal: 26–30°C</span>
							<span className="muted" style={{ fontSize: '0.75rem' }}>35°C</span>
						</div>
					</div>

					{/* DO Slider */}
					<div className="valueCard" style={{ padding: 16 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
							<div className="valueTitle">Dissolved Oxygen</div>
							<div className={`valueBadge ${doVal >= 5 ? 'good' : doVal >= 4 ? 'warn' : 'bad'}`}>
								{doVal >= 5 ? 'Safe' : doVal >= 4 ? 'Low' : 'Critical'}
							</div>
						</div>
						<div className="valueMain" style={{ marginBottom: 12 }}>
							<span className="valueNumber mono" style={{ fontSize: '1.8rem' }}>
								{formatNumber(doVal, { maximumFractionDigits: 1 })}
							</span>
							<span className="valueUnit">mg/L</span>
						</div>
						<input
							type="range"
							min={2}
							max={12}
							step={0.1}
							value={doVal}
							onChange={(e) => setDoVal(parseFloat(e.target.value))}
							style={{ width: '100%', accentColor: doVal >= 5 ? '#16a34a' : doVal >= 4 ? '#d97706' : '#dc2626' }}
						/>
						<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
							<span className="muted" style={{ fontSize: '0.75rem' }}>2 mg/L</span>
							<span className="muted" style={{ fontSize: '0.75rem' }}>Keep &gt; 5 mg/L</span>
							<span className="muted" style={{ fontSize: '0.75rem' }}>12 mg/L</span>
						</div>
					</div>

					{/* Salinity Slider */}
					<div className="valueCard" style={{ padding: 16 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
							<div className="valueTitle">Salinity</div>
							<div className={`valueBadge ${salinity >= 15 && salinity <= 25 ? 'good' : 'warn'}`}>
								{salinity >= 15 && salinity <= 25 ? 'Normal' : 'Check'}
							</div>
						</div>
						<div className="valueMain" style={{ marginBottom: 12 }}>
							<span className="valueNumber mono" style={{ fontSize: '1.8rem' }}>
								{formatNumber(salinity, { maximumFractionDigits: 0 })}
							</span>
							<span className="valueUnit">ppt</span>
						</div>
						<input
							type="range"
							min={5}
							max={40}
							step={1}
							value={salinity}
							onChange={(e) => setSalinity(parseFloat(e.target.value))}
							style={{ width: '100%', accentColor: salinity >= 15 && salinity <= 25 ? '#16a34a' : '#d97706' }}
						/>
						<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
							<span className="muted" style={{ fontSize: '0.75rem' }}>5 ppt</span>
							<span className="muted" style={{ fontSize: '0.75rem' }}>Optimal: 15–25 ppt</span>
							<span className="muted" style={{ fontSize: '0.75rem' }}>40 ppt</span>
						</div>
					</div>
				</div>
			</div>

			{/* Action Buttons */}
			<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
				<button
					className="btnPrimary"
					onClick={handleRun}
					disabled={loading}
					style={{
						padding: '12px 24px',
						fontSize: '1rem',
						fontWeight: 600,
						display: 'flex',
						alignItems: 'center',
						gap: 8
					}}
				>
					{loading ? (
						<>
							<span className="spinner" style={{ width: 16, height: 16 }}></span>
							Running ML Model...
						</>
					) : (
						<>
							<span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: 'rgba(255,255,255,0.2)', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700 }}>ML</span>
							Run ML Prediction
						</>
					)}
				</button>
				<button
					onClick={handleReset}
					style={{
						padding: '12px 20px',
						background: 'transparent',
						border: '1px solid rgba(148, 163, 184, 0.4)',
						borderRadius: 8,
						cursor: 'pointer',
						fontSize: '0.9rem'
					}}
				>
					Reset to Defaults
				</button>
				{error && (
					<span style={{ color: 'var(--bad)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
						<span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, background: 'var(--bad)', borderRadius: '50%', color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>!</span>
						Error: {error}
					</span>
				)}
			</div>

			{/* ML Results Section */}
			{lastResult && (
				<div style={{
					marginTop: 8,
					paddingTop: 20,
					borderTop: '2px solid rgba(148, 163, 184, 0.3)'
				}}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
						<h3 style={{ margin: 0, fontSize: '1.1rem' }}>
							{getModelIcon(mlResult?.model_type)} ML Prediction Results
						</h3>
						{mlResult?.using_trained_model && (
							<span style={{
								padding: '4px 10px',
								background: 'rgba(22, 163, 74, 0.15)',
								borderRadius: 12,
								fontSize: '0.75rem',
								color: '#16a34a',
								fontWeight: 600,
								display: 'inline-flex',
								alignItems: 'center',
								gap: 4
							}}>
								<span style={{ width: 14, height: 14, borderRadius: '50%', background: '#16a34a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.6rem' }}>✓</span>
								Using Trained Model
							</span>
						)}
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
						{/* Main Classification Result */}
						<div style={{
							padding: 20,
							background: classColors.bg,
							border: `2px solid ${classColors.border}`,
							borderRadius: 12
						}}>
							<div style={{ fontSize: '0.85rem', color: classColors.text, marginBottom: 4, fontWeight: 500 }}>
								ML Classification
							</div>
							<div style={{ fontSize: '2rem', fontWeight: 700, color: classColors.text, marginBottom: 8 }}>
								{mlResult?.ml_class || current?.wqi_class || 'Unknown'}
							</div>
							<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
								<span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Confidence:</span>
								<div style={{
									flex: 1,
									height: 8,
									background: 'rgba(0,0,0,0.1)',
									borderRadius: 4,
									overflow: 'hidden'
								}}>
									<div style={{
										width: `${(mlResult?.ml_confidence || 0.7) * 100}%`,
										height: '100%',
										background: classColors.border,
										borderRadius: 4
									}}></div>
								</div>
								<span style={{ fontWeight: 600, color: classColors.text }}>
									{formatNumber((mlResult?.ml_confidence || 0.7) * 100, { maximumFractionDigits: 0 })}%
								</span>
							</div>
						</div>

						{/* WQI Score */}
						<div style={{
							padding: 20,
							background: 'rgba(37, 99, 235, 0.08)',
							border: '1px solid rgba(37, 99, 235, 0.2)',
							borderRadius: 12
						}}>
							<div style={{ fontSize: '0.85rem', color: '#2563eb', marginBottom: 4, fontWeight: 500 }}>
								Water Quality Index
							</div>
							<div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
								<span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#1d4ed8' }}>
									{formatNumber(mlResult?.wqi_score || current?.wqi || 0, { maximumFractionDigits: 0 })}
								</span>
								<span style={{ fontSize: '1rem', color: '#64748b' }}>/ 100</span>
							</div>
							<div style={{ marginTop: 8 }}>
								<div style={{
									height: 8,
									background: 'linear-gradient(to right, #dc2626, #d97706, #2563eb, #16a34a)',
									borderRadius: 4,
									position: 'relative'
								}}>
									<div style={{
										position: 'absolute',
										left: `${Math.min(100, mlResult?.wqi_score || current?.wqi || 0)}%`,
										top: -4,
										width: 16,
										height: 16,
										background: '#fff',
										border: '3px solid #1d4ed8',
										borderRadius: '50%',
										transform: 'translateX(-50%)'
									}}></div>
								</div>
								<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.7rem', color: '#94a3b8' }}>
									<span>Very Bad</span>
									<span>Bad</span>
									<span>Medium</span>
									<span>Good</span>
								</div>
							</div>
						</div>

						{/* Model Info */}
						<div style={{
							padding: 20,
							background: 'rgba(148, 163, 184, 0.08)',
							border: '1px solid rgba(148, 163, 184, 0.2)',
							borderRadius: 12
						}}>
							<div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 8, fontWeight: 500 }}>
								Model Information
							</div>
							<div style={{ display: 'grid', gap: 8 }}>
								<div style={{ display: 'flex', justifyContent: 'space-between' }}>
									<span className="muted">Model Type:</span>
									<span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
										{mlResult?.model_type === 'random_forest' ? (
											<><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: '#16a34a', borderRadius: 4, color: '#fff', fontSize: '0.6rem', fontWeight: 700 }}>RF</span> Random Forest</>
										) : mlResult?.model_type === 'mlp' ? (
											<><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: '#8b5cf6', borderRadius: 4, color: '#fff', fontSize: '0.6rem', fontWeight: 700 }}>NN</span> Neural Network (MLP)</>
										) : mlResult?.model_type || modelInfo?.classification_model || 'WQI Computation'}
									</span>
								</div>
								<div style={{ display: 'flex', justifyContent: 'space-between' }}>
									<span className="muted">Features Used:</span>
									<span style={{ fontWeight: 600 }}>{mlResult?.features_used || 14} parameters</span>
								</div>
								<div style={{ display: 'flex', justifyContent: 'space-between' }}>
									<span className="muted">Status:</span>
									<span style={{
										fontWeight: 600,
										color: mlResult?.using_trained_model ? '#16a34a' : '#d97706',
										display: 'flex',
										alignItems: 'center',
										gap: 4
									}}>
										<span style={{ width: 8, height: 8, borderRadius: '50%', background: mlResult?.using_trained_model ? '#16a34a' : '#d97706' }}></span>
										{mlResult?.using_trained_model ? 'Trained Model' : 'Rule-based'}
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* Class Probabilities */}
					{mlResult?.ml_probabilities && Object.keys(mlResult.ml_probabilities).length > 0 && (
						<div style={{ marginTop: 16 }}>
							<div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>
								Class Probabilities
							</div>
							<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
								{(['Good', 'Medium', 'Bad', 'Very Bad'] as const).map(cls => {
									const prob = mlResult.ml_probabilities[cls] || 0
									const colors = getClassColor(cls)
									return (
										<div key={cls} style={{
											flex: '1 1 120px',
											padding: 12,
											background: colors.bg,
											border: `1px solid ${colors.border}`,
											borderRadius: 8,
											textAlign: 'center'
										}}>
											<div style={{ fontSize: '0.75rem', color: colors.text, marginBottom: 4 }}>
												{cls}
											</div>
											<div style={{ fontSize: '1.2rem', fontWeight: 700, color: colors.text }}>
												{formatNumber(prob * 100, { maximumFractionDigits: 1 })}%
											</div>
										</div>
									)
								})}
							</div>
						</div>
					)}

					{/* Alerts */}
					{alerts.length > 0 && (
						<div style={{ marginTop: 16 }}>
							<div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
								<span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: '#dc2626', borderRadius: '50%', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>!</span>
								Alerts ({alerts.length})
							</div>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
								{alerts.slice(0, 3).map((alert, idx) => (
									<div key={idx} style={{
										padding: 12,
										background: alert.level === 'critical' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(217, 119, 6, 0.1)',
										border: `1px solid ${alert.level === 'critical' ? '#dc2626' : '#d97706'}`,
										borderRadius: 8,
										display: 'flex',
										alignItems: 'center',
										gap: 12
									}}>
										<span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: alert.level === 'critical' ? '#dc2626' : '#d97706', borderRadius: '50%', color: '#fff', fontSize: '0.8rem', fontWeight: 700 }}>!</span>
										<div>
											<div style={{ fontWeight: 600, color: alert.level === 'critical' ? '#dc2626' : '#b45309' }}>
												{alert.parameter}
											</div>
											<div style={{ fontSize: '0.85rem', color: '#64748b' }}>
												{alert.farmer_message || alert.message}
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Simple Status Message */}
					{simpleStatus && (
						<div style={{
							marginTop: 16,
							padding: 16,
							background: classColors.bg,
							borderRadius: 8,
							textAlign: 'center'
						}}>
							<div style={{ fontSize: '1.1rem', fontWeight: 500 }}>
								{simpleStatus.message}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
