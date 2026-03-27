import type { DashboardApiResponse, SavedFarmSnapshot } from '../lib/types'
import { formatDateTime } from '../lib/format'

type Props = {
	data: DashboardApiResponse
	history: SavedFarmSnapshot[]
	pondFilter: number | null
}

export function DiseaseDetectionView({ data, history, pondFilter }: Props) {
	const { dashboard } = data
	const water = pondFilter ? data.water_quality.filter((w) => w.pond_id === pondFilter) : data.water_quality
	const feed = pondFilter ? data.feed.filter((f) => f.pond_id === pondFilter) : data.feed

	// Simulate disease detection based on water quality and feed data
	const diseaseRiskFactors = water.map((w) => {
		let riskScore = 0
		const factors: string[] = []

		if (w.dissolved_oxygen < 5) {
			riskScore += 30
			factors.push('Low dissolved oxygen')
		}
		if (w.temperature < 26 || w.temperature > 30) {
			riskScore += 20
			factors.push('Suboptimal temperature')
		}
		if (w.ph < 7.5 || w.ph > 8.5) {
			riskScore += 15
			factors.push('pH out of range')
		}
		if (w.ammonia > 0.2) {
			riskScore += 25
			factors.push('High ammonia levels')
		}
		if (w.nitrite > 0.1) {
			riskScore += 20
			factors.push('Elevated nitrite')
		}

		const riskLevel = riskScore < 30 ? 'low' : riskScore < 60 ? 'medium' : 'high'

		return {
			pondId: w.pond_id,
			riskScore,
			riskLevel,
			factors,
			status: w.status,
			alerts: w.alerts || []
		}
	})

	const getRiskColor = (level: string) => {
		switch (level) {
			case 'low':
				return 'var(--good)'
			case 'medium':
				return 'var(--warn)'
			case 'high':
				return 'var(--bad)'
			default:
				return 'var(--muted)'
		}
	}

	const commonDiseases = [
		{
			name: 'White Spot Syndrome (WSSV)',
			symptoms: ['White spots on shell', 'Reduced feeding', 'Lethargy'],
			prevention: 'Maintain optimal water quality, avoid stress, proper biosecurity'
		},
		{
			name: 'Early Mortality Syndrome (EMS)',
			symptoms: ['Mass mortality in first 30 days', 'Empty gut', 'Hepatopancreas necrosis'],
			prevention: 'Use disease-free postlarvae, maintain water quality, proper feed management'
		},
		{
			name: 'Vibriosis',
			symptoms: ['Reduced feeding', 'Darkened gills', 'Lethargy'],
			prevention: 'Maintain DO > 5 mg/L, reduce organic matter, proper aeration'
		},
		{
			name: 'Fouling Disease',
			symptoms: ['Fouling on shell', 'Reduced growth', 'Molting issues'],
			prevention: 'Maintain water quality, proper filtration, regular water exchange'
		}
	]

	return (
		<div className="dashGrid">
			<div className="panel spanAll">
				<div className="panelHeader">
					<div className="panelTitle">Disease Detection & Risk Assessment</div>
					<div className="panelRight">
						<span className="muted">Updated {formatDateTime(dashboard.timestamp)}</span>
					</div>
				</div>
				<div style={{ padding: 16 }}>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12, marginBottom: 20 }}>
						{diseaseRiskFactors.map((risk) => (
							<div
								key={risk.pondId}
								style={{
									padding: 16,
									backgroundColor: 'rgba(255, 255, 255, 0.5)',
									borderLeft: `4px solid ${getRiskColor(risk.riskLevel)}`,
									borderRadius: 8
								}}
							>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
									<div style={{ fontWeight: 600 }}>Pond {risk.pondId}</div>
									<span
										className="chip"
										style={{
											backgroundColor: getRiskColor(risk.riskLevel),
											color: 'white',
											fontSize: '0.75rem',
											padding: '4px 8px',
											borderRadius: '4px'
										}}
									>
										{risk.riskLevel.toUpperCase()} RISK
									</span>
								</div>
								<div style={{ marginBottom: 8 }}>
									<div className="muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>
										Risk Score
									</div>
									<div style={{ fontSize: '1.5rem', fontWeight: 600, color: getRiskColor(risk.riskLevel) }}>
										{risk.riskScore}%
									</div>
								</div>
								{risk.factors.length > 0 && (
									<div>
										<div className="muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>
											Risk Factors:
										</div>
										<ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.875rem', color: 'var(--muted)' }}>
											{risk.factors.map((factor, i) => (
												<li key={i}>{factor}</li>
											))}
										</ul>
									</div>
								)}
								{risk.alerts.length > 0 && (
									<div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--bad)' }}>
										{risk.alerts.length} active alert{risk.alerts.length > 1 ? 's' : ''}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="panel spanAll">
				<div className="panelHeader">
					<div className="panelTitle">Common Diseases & Prevention</div>
				</div>
				<div style={{ padding: 16 }}>
					{commonDiseases.map((disease, i) => (
						<div
							key={i}
							style={{
								marginBottom: 16,
								padding: 16,
								backgroundColor: 'rgba(255, 255, 255, 0.5)',
								borderLeft: '4px solid rgba(239, 68, 68, 0.6)',
								borderRadius: 8
							}}
						>
							<div style={{ fontWeight: 600, marginBottom: 8, fontSize: '1.1rem' }}>{disease.name}</div>
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
								<div>
									<div className="muted" style={{ fontSize: '0.75rem', marginBottom: 4, fontWeight: 600 }}>
										SYMPTOMS
									</div>
									<ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.875rem', color: 'var(--text)' }}>
										{disease.symptoms.map((symptom, j) => (
											<li key={j}>{symptom}</li>
										))}
									</ul>
								</div>
								<div>
									<div className="muted" style={{ fontSize: '0.75rem', marginBottom: 4, fontWeight: 600 }}>
										PREVENTION
									</div>
									<div style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.6 }}>{disease.prevention}</div>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			<div className="panel spanAll">
				<div className="panelHeader">
					<div className="panelTitle">Health Monitoring Recommendations</div>
				</div>
				<div style={{ padding: 16 }}>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
						<div style={{ padding: 16, backgroundColor: 'rgba(37, 99, 235, 0.05)', borderRadius: 8 }}>
							<div style={{ fontWeight: 600, marginBottom: 4 }}>🔍 Regular Monitoring</div>
							<div className="muted" style={{ fontSize: '0.875rem' }}>
								Monitor water quality parameters daily. Check for behavioral changes and feeding patterns.
							</div>
						</div>
						<div style={{ padding: 16, backgroundColor: 'rgba(34, 197, 94, 0.05)', borderRadius: 8 }}>
							<div style={{ fontWeight: 600, marginBottom: 4 }}>💧 Water Quality</div>
							<div className="muted" style={{ fontSize: '0.875rem' }}>
								Maintain optimal DO (&gt;5 mg/L), temperature (26-30°C), and pH (7.5-8.5) to prevent disease outbreaks.
							</div>
						</div>
						<div style={{ padding: 16, backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: 8 }}>
							<div style={{ fontWeight: 600, marginBottom: 4 }}>🍽️ Feed Management</div>
							<div className="muted" style={{ fontSize: '0.875rem' }}>
								Avoid overfeeding. Remove uneaten feed promptly. Use high-quality feed with proper nutrition.
							</div>
						</div>
						<div style={{ padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 8 }}>
							<div style={{ fontWeight: 600, marginBottom: 4 }}>🚨 Early Detection</div>
							<div className="muted" style={{ fontSize: '0.875rem' }}>
								If disease is suspected, isolate affected ponds immediately and consult with aquaculture health experts.
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

