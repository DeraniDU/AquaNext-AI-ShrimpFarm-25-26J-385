import { useState } from 'react'

type Props = {
	ponds: number
	onPondsChange: (ponds: number) => void
	autoRefresh: boolean
	onAutoRefreshChange: (enabled: boolean) => void
}

export function SettingsView({ ponds, onPondsChange, autoRefresh, onAutoRefreshChange }: Props) {
	const [notifications, setNotifications] = useState({
		alerts: true,
		feeding: true,
		maintenance: false,
		reports: false
	})

	const [units, setUnits] = useState<'metric' | 'imperial'>('metric')
	const [theme, setTheme] = useState<'light' | 'dark'>('light')

	return (
		<div className="dashGrid">
			<div className="panel spanAll">
				<div className="panelHeader">
					<div className="panelTitle">Settings</div>
				</div>
				<div style={{ padding: 16 }}>
					{/* Farm Configuration */}
					<div style={{ marginBottom: 32 }}>
						<h3 style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: 600 }}>Farm Configuration</h3>
						<div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
							<label style={{ minWidth: 150 }}>Number of Ponds</label>
							<select value={ponds} onChange={(e) => onPondsChange(Number(e.target.value))}>
								{[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
									<option key={n} value={n}>
										{n}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Data Refresh */}
					<div style={{ marginBottom: 32 }}>
						<h3 style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: 600 }}>Data Refresh</h3>
						<div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
							<label style={{ minWidth: 150 }}>Auto Refresh</label>
							<label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
								<input type="checkbox" checked={autoRefresh} onChange={(e) => onAutoRefreshChange(e.target.checked)} />
								<span>Enable (15 second interval)</span>
							</label>
						</div>
					</div>

					{/* Notifications */}
					<div style={{ marginBottom: 32 }}>
						<h3 style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: 600 }}>Notifications</h3>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
							<label style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
								<input
									type="checkbox"
									checked={notifications.alerts}
									onChange={(e) => setNotifications({ ...notifications, alerts: e.target.checked })}
								/>
								<span>Critical Alerts</span>
							</label>
							<label style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
								<input
									type="checkbox"
									checked={notifications.feeding}
									onChange={(e) => setNotifications({ ...notifications, feeding: e.target.checked })}
								/>
								<span>Feeding Reminders</span>
							</label>
							<label style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
								<input
									type="checkbox"
									checked={notifications.maintenance}
									onChange={(e) => setNotifications({ ...notifications, maintenance: e.target.checked })}
								/>
								<span>Maintenance Due</span>
							</label>
							<label style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
								<input
									type="checkbox"
									checked={notifications.reports}
									onChange={(e) => setNotifications({ ...notifications, reports: e.target.checked })}
								/>
								<span>Daily Reports</span>
							</label>
						</div>
					</div>

					{/* Display Preferences */}
					<div style={{ marginBottom: 32 }}>
						<h3 style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: 600 }}>Display Preferences</h3>
						<div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
							<label style={{ minWidth: 150 }}>Units</label>
							<select value={units} onChange={(e) => setUnits(e.target.value as 'metric' | 'imperial')}>
								<option value="metric">Metric (kg, °C, mg/L)</option>
								<option value="imperial">Imperial (lbs, °F, ppm)</option>
							</select>
						</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
							<label style={{ minWidth: 150 }}>Theme</label>
							<select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}>
								<option value="light">Light</option>
								<option value="dark">Dark</option>
							</select>
						</div>
					</div>

					{/* Export & Data */}
					<div style={{ marginBottom: 32 }}>
						<h3 style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: 600 }}>Data Management</h3>
						<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
							<button onClick={() => alert('Export functionality coming soon')}>Export to CSV</button>
							<button onClick={() => alert('Export functionality coming soon')}>Export to PDF</button>
							<button onClick={() => alert('Export functionality coming soon')}>Export to JSON</button>
						</div>
					</div>

					{/* System Info */}
					<div>
						<h3 style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: 600 }}>System Information</h3>
						<div style={{ padding: 16, backgroundColor: 'rgba(17, 24, 39, 0.05)', borderRadius: 8 }}>
							<div className="muted" style={{ fontSize: '0.875rem', lineHeight: 1.8 }}>
								<div>
									<strong>Version:</strong> 1.0.0
								</div>
								<div>
									<strong>Data Source:</strong> Mock Data (Standalone Mode)
								</div>
								<div>
									<strong>Last Update:</strong> {new Date().toLocaleString()}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

