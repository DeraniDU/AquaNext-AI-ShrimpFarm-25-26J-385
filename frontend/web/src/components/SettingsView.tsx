import { useState } from 'react'
import type { BudgetSettings, EconomicSettings } from '../lib/types'
import { useFeedingSystemStatus } from '../lib/useFeedingSystemStatus'

type Props = {
	ponds: number
	onPondsChange: (ponds: number) => void
	autoRefresh: boolean
	onAutoRefreshChange: (enabled: boolean) => void
	economicSettings: EconomicSettings
	budgetSettings: BudgetSettings
	onEconomicSettingsChange: (settings: EconomicSettings) => void
	onBudgetSettingsChange: (settings: BudgetSettings) => void
}

export function SettingsView({
	ponds,
	onPondsChange,
	autoRefresh,
	onAutoRefreshChange,
	economicSettings,
	budgetSettings,
	onEconomicSettingsChange,
	onBudgetSettingsChange
}: Props) {
	const { gatewayOk, feedingSystemOk, loading, error, lastCheckedAt, check } = useFeedingSystemStatus()
	const [notifications, setNotifications] = useState({
		alerts: true,
		feeding: true,
		maintenance: false,
		reports: false
	})

	const [units, setUnits] = useState<'metric' | 'imperial'>('metric')
	const [theme, setTheme] = useState<'light' | 'dark'>('light')
	const updateEconomic = <K extends keyof EconomicSettings>(key: K, value: number) => {
		onEconomicSettingsChange({ ...economicSettings, [key]: value })
	}
	const updateBudget = <K extends keyof BudgetSettings>(key: K, value: number) => {
		onBudgetSettingsChange({ ...budgetSettings, [key]: value })
	}

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

					<div style={{ marginBottom: 32 }}>
						<h3 style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: 600 }}>Economics</h3>
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
							<NumberField
								label="Energy cost (LKR/kWh)"
								value={economicSettings.energy_cost_per_kwh_lkr}
								onChange={(value) => updateEconomic('energy_cost_per_kwh_lkr', value)}
							/>
							<NumberField
								label="Feed cost (LKR/kg)"
								value={economicSettings.feed_cost_per_kg_lkr}
								onChange={(value) => updateEconomic('feed_cost_per_kg_lkr', value)}
							/>
							<NumberField
								label="Labor cost (LKR/hour)"
								value={economicSettings.labor_cost_per_hour_lkr}
								onChange={(value) => updateEconomic('labor_cost_per_hour_lkr', value)}
							/>
							<NumberField
								label="Shrimp selling price (LKR/kg)"
								value={economicSettings.shrimp_price_per_kg_lkr}
								onChange={(value) => updateEconomic('shrimp_price_per_kg_lkr', value)}
							/>
							<NumberField
								label="Medicine reserve (LKR/pond)"
								value={economicSettings.medicine_cost_per_pond_lkr}
								onChange={(value) => updateEconomic('medicine_cost_per_pond_lkr', value)}
							/>
							<NumberField
								label="Maintenance reserve (LKR/pond)"
								value={economicSettings.maintenance_cost_per_pond_lkr}
								onChange={(value) => updateEconomic('maintenance_cost_per_pond_lkr', value)}
							/>
						</div>
					</div>

					<div style={{ marginBottom: 32 }}>
						<h3 style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: 600 }}>Budgets</h3>
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
							<NumberField
								label="Weekly feed budget (LKR)"
								value={budgetSettings.weekly_feed_budget_lkr}
								onChange={(value) => updateBudget('weekly_feed_budget_lkr', value)}
							/>
							<NumberField
								label="Weekly energy budget (LKR)"
								value={budgetSettings.weekly_energy_budget_lkr}
								onChange={(value) => updateBudget('weekly_energy_budget_lkr', value)}
							/>
							<NumberField
								label="Weekly labor budget (LKR)"
								value={budgetSettings.weekly_labor_budget_lkr}
								onChange={(value) => updateBudget('weekly_labor_budget_lkr', value)}
							/>
							<NumberField
								label="Cycle budget (LKR)"
								value={budgetSettings.cycle_budget_lkr}
								onChange={(value) => updateBudget('cycle_budget_lkr', value)}
							/>
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

					{/* Backend status: API Gateway & Feeding System */}
					<div style={{ marginBottom: 32 }}>
						<h3 style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: 600 }}>Backend Status (API Gateway)</h3>
						<div style={{ padding: 16, backgroundColor: 'rgba(17, 24, 39, 0.05)', borderRadius: 8 }}>
							<div className="muted" style={{ fontSize: '0.875rem', lineHeight: 1.8 }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
									<span><strong>Gateway:</strong></span>
									{loading ? (
										<span>Checking…</span>
									) : (
										<span style={{ color: gatewayOk ? 'var(--color-success, #059669)' : 'var(--color-danger, #dc2626)' }}>
											{gatewayOk ? '✓ Connected' : '✗ Not connected'}
										</span>
									)}
								</div>
								<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
									<span><strong>Feeding System (via gateway):</strong></span>
									{loading ? (
										<span>Checking…</span>
									) : (
										<span style={{ color: feedingSystemOk ? 'var(--color-success, #059669)' : 'var(--color-danger, #dc2626)' }}>
											{feedingSystemOk ? '✓ Connected' : '✗ Not connected'}
										</span>
									)}
								</div>
								{error && <div style={{ color: 'var(--color-danger, #dc2626)', marginBottom: 8 }}>{error}</div>}
								{lastCheckedAt && !loading && (
									<div style={{ marginBottom: 8 }}>Last checked: {new Date(lastCheckedAt).toLocaleString()}</div>
								)}
								<button type="button" onClick={check} disabled={loading}>
									{loading ? 'Checking…' : 'Check connection'}
								</button>
							</div>
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
									<strong>API Endpoint:</strong> http://localhost:8000/api
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

function NumberField({
	label,
	value,
	onChange
}: {
	label: string
	value: number
	onChange: (value: number) => void
}) {
	return (
		<label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
			<span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{label}</span>
			<input
				type="number"
				value={value}
				min={0}
				onChange={(e) => onChange(Number(e.target.value) || 0)}
				style={{
					minHeight: 38,
					padding: '8px 10px',
					border: '1px solid rgba(17, 24, 39, 0.12)',
					borderRadius: 10,
					background: 'rgba(255, 255, 255, 0.92)',
					color: 'rgba(17, 24, 39, 0.88)'
				}}
			/>
		</label>
	)
}

