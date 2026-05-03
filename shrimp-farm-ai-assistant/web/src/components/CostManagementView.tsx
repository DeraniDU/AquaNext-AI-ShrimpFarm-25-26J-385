import type { DashboardApiResponse, BudgetMetricRow, PondCostRow, SavingsOpportunity } from '../lib/types'
import { formatCurrencyLkr, formatDateTime, formatNumber } from '../lib/format'

type Props = {
	data: DashboardApiResponse
	pondFilter: number | null
	onOpenSettings?: () => void
}

function varianceTone(varianceLkr: number) {
	if (varianceLkr > 0) return 'varianceBad'
	if (varianceLkr < 0) return 'varianceGood'
	return 'varianceNeutral'
}

function BudgetCard({
	label,
	period,
	item
}: {
	label: string
	period: string
	item: BudgetMetricRow
}) {
	const vClass = varianceTone(item.variance_lkr)
	return (
		<div className="costBudgetCard">
			<div className="costBudgetCardLabel">{label}</div>
			<div className="costBudgetCardPeriod">{period}</div>
			<div className="costBudgetCardRow">
				<span className="muted">Budget</span>
				<span className="mono">{formatCurrencyLkr(item.budget_lkr)}</span>
			</div>
			<div className="costBudgetCardRow">
				<span className="muted">Actual (run rate)</span>
				<span className="mono">{formatCurrencyLkr(item.actual_lkr)}</span>
			</div>
			<div className={`costBudgetCardRow costBudgetVariance ${vClass}`}>
				<span>Variance</span>
				<span className="mono">
					{item.variance_lkr >= 0 ? '+' : ''}
					{formatCurrencyLkr(item.variance_lkr)} ({formatNumber(item.variance_pct, { maximumFractionDigits: 1 })}%)
				</span>
			</div>
		</div>
	)
}

function CostMixBar({ row }: { row: PondCostRow }) {
	const parts = [
		{ key: 'feed', value: row.feed_cost_lkr, color: 'rgba(34, 197, 94, 0.85)' },
		{ key: 'energy', value: row.energy_cost_lkr, color: 'rgba(59, 130, 246, 0.85)' },
		{ key: 'labor', value: row.labor_cost_lkr, color: 'rgba(234, 179, 8, 0.9)' },
		{ key: 'other', value: row.other_cost_lkr, color: 'rgba(139, 92, 246, 0.85)' }
	]
	const total = parts.reduce((s, p) => s + p.value, 0) || 1
	return (
		<div className="costMixBar" title={`Total ${formatCurrencyLkr(row.total_cost_lkr)}`}>
			{parts.map((p) => (
				<div
					key={p.key}
					className="costMixSeg"
					style={{
						width: `${(p.value / total) * 100}%`,
						background: p.color,
						minWidth: p.value > 0 ? 4 : 0
					}}
				/>
			))}
		</div>
	)
}

function priorityBadgeClass(p: string) {
	if (p === 'high') return 'badge bad'
	if (p === 'medium') return 'badge warn'
	return 'badge info'
}

export function CostManagementView({ data, pondFilter, onOpenSettings }: Props) {
	const costSummary = data.cost_summary
	const budgetSummary = data.budget_summary
	const economicSettings = data.economic_settings
	const budgetSettings = data.budget_settings
	const savingsRaw = data.savings_opportunities ?? []

	if (!costSummary || !budgetSummary || !economicSettings) {
		return (
			<div className="costManagementPage">
				<div className="panel spanAll">
					<div className="emptyState">Cost fields were not returned by the API. Reload after a successful `/api/dashboard` response.</div>
				</div>
			</div>
		)
	}

	const farmCost = costSummary.farm
	const focusRow: PondCostRow = pondFilter
		? costSummary.ponds.find((p) => p.pond_id === pondFilter) ?? farmCost
		: farmCost
	const tableRows = pondFilter ? costSummary.ponds.filter((p) => p.pond_id === pondFilter) : costSummary.ponds
	const savings: SavingsOpportunity[] = savingsRaw
		.filter((item) => (pondFilter ? item.pond_id === pondFilter || item.pond_id == null : true))
		.sort((a, b) => b.savings_lkr - a.savings_lkr)

	const budgetPeriodNote = budgetSummary.period_label
	const cycleDays = budgetSummary.projected_cycle_days

	return (
		<div className="costManagementPage">
			<header className="costManagementHeader">
				<div>
					<h1 className="costManagementTitle">Cost management</h1>
					<p className="costManagementSubtitle">
						P&amp;L, budget variance, and savings from the latest dashboard snapshot
						{data.dashboard.timestamp ? ` · ${formatDateTime(data.dashboard.timestamp)}` : ''}
					</p>
				</div>
				{onOpenSettings ? (
					<button type="button" onClick={onOpenSettings} className="costManagementSettingsBtn">
						Open settings
					</button>
				) : null}
			</header>

			<div className="costKpiRow">
				<div className="panel costKpiCard">
					<div className="costKpiLabel">Revenue (est.)</div>
					<div className="costKpiValue mono">{formatCurrencyLkr(focusRow.revenue_lkr)}</div>
					<div className="costKpiHint">Shrimp price × biomass · {pondFilter ? `Pond ${pondFilter}` : 'All ponds'}</div>
				</div>
				<div className="panel costKpiCard">
					<div className="costKpiLabel">Total operating cost</div>
					<div className="costKpiValue mono">{formatCurrencyLkr(focusRow.total_cost_lkr)}</div>
					<div className="costKpiHint">Daily run rate in snapshot</div>
				</div>
				<div className="panel costKpiCard">
					<div className="costKpiLabel">Gross profit</div>
					<div className={`costKpiValue mono ${focusRow.gross_profit_lkr >= 0 ? 'toneGood' : 'toneBad'}`}>
						{formatCurrencyLkr(focusRow.gross_profit_lkr)}
					</div>
					<div className="costKpiHint">Margin {formatNumber(focusRow.gross_margin_pct, { maximumFractionDigits: 1 })}%</div>
				</div>
				<div className="panel costKpiCard">
					<div className="costKpiLabel">Cost / kg biomass</div>
					<div className="costKpiValue mono">{formatCurrencyLkr(focusRow.cost_per_kg_biomass_lkr)}</div>
					<div className="costKpiHint">Efficiency indicator</div>
				</div>
			</div>

			<div className="costTwoCol">
				<section className="panel costPanel">
					<div className="panelTitle">Economic assumptions</div>
					<p className="muted costPanelIntro">Unit rates used for cost and revenue (from server config / dashboard request).</p>
					<ul className="costAssumptionList">
						<li>
							<span>Shrimp price</span>
							<span className="mono">{formatCurrencyLkr(economicSettings.shrimp_price_per_kg_lkr)} / kg</span>
						</li>
						<li>
							<span>Feed cost</span>
							<span className="mono">{formatCurrencyLkr(economicSettings.feed_cost_per_kg_lkr)} / kg</span>
						</li>
						<li>
							<span>Labor</span>
							<span className="mono">{formatCurrencyLkr(economicSettings.labor_cost_per_hour_lkr)} / hr</span>
						</li>
						<li>
							<span>Energy</span>
							<span className="mono">{formatCurrencyLkr(economicSettings.energy_cost_per_kwh_lkr)} / kWh</span>
						</li>
						<li>
							<span>Medicine / pond</span>
							<span className="mono">{formatCurrencyLkr(economicSettings.medicine_cost_per_pond_lkr)}</span>
						</li>
						<li>
							<span>Maintenance / pond</span>
							<span className="mono">{formatCurrencyLkr(economicSettings.maintenance_cost_per_pond_lkr)}</span>
						</li>
					</ul>
				</section>

				<section className="panel costPanel">
					<div className="panelTitle">Budget targets</div>
					<p className="muted costPanelIntro">Reference budgets (same source as API defaults unless overridden by client).</p>
					{budgetSettings ? (
						<ul className="costAssumptionList">
							<li>
								<span>Weekly feed budget</span>
								<span className="mono">{formatCurrencyLkr(budgetSettings.weekly_feed_budget_lkr)}</span>
							</li>
							<li>
								<span>Weekly energy budget</span>
								<span className="mono">{formatCurrencyLkr(budgetSettings.weekly_energy_budget_lkr)}</span>
							</li>
							<li>
								<span>Weekly labor budget</span>
								<span className="mono">{formatCurrencyLkr(budgetSettings.weekly_labor_budget_lkr)}</span>
							</li>
							<li>
								<span>Cycle budget ({cycleDays}d basis)</span>
								<span className="mono">{formatCurrencyLkr(budgetSettings.cycle_budget_lkr)}</span>
							</li>
						</ul>
					) : (
						<div className="muted">No budget settings in response.</div>
					)}
				</section>
			</div>

			<section className="panel spanAll" style={{ marginTop: 12 }}>
				<div className="panelTitle">Budget vs actual</div>
				<p className="muted" style={{ marginBottom: 16, fontSize: '0.875rem' }}>
					{budgetPeriodNote} · cycle projection uses {cycleDays}-day horizon.
				</p>
				<div className="costBudgetGrid">
					<BudgetCard label="Feed" period="weekly" item={budgetSummary.feed} />
					<BudgetCard label="Energy" period="weekly" item={budgetSummary.energy} />
					<BudgetCard label="Labor" period="weekly" item={budgetSummary.labor} />
					<BudgetCard label="Total cycle" period={`${cycleDays} days`} item={budgetSummary.cycle} />
				</div>
			</section>

			<section className="panel spanAll" style={{ marginTop: 12 }}>
				<div className="panelTitle">Cost by pond</div>
				<p className="muted" style={{ marginBottom: 12, fontSize: '0.875rem' }}>
					Highest cost: {costSummary.highest_cost_pond_label ?? '—'}
					{costSummary.highest_cost_pond_id != null ? ` (Pond ${costSummary.highest_cost_pond_id})` : ''}
				</p>
				<div style={{ overflowX: 'auto' }}>
					<table className="costTable">
						<thead>
							<tr>
								<th>Pond</th>
								<th className="num">Biomass (kg)</th>
								<th>Mix</th>
								<th className="num">Revenue</th>
								<th className="num">Cost</th>
								<th className="num">Profit</th>
								<th className="num">Margin</th>
							</tr>
						</thead>
						<tbody>
							{tableRows.map((row) => (
								<tr key={row.pond_id ?? row.pond_label}>
									<td>{row.pond_label}</td>
									<td className="num mono">{formatNumber(row.biomass_kg, { maximumFractionDigits: 1 })}</td>
									<td style={{ minWidth: 140 }}>
										<CostMixBar row={row} />
									</td>
									<td className="num mono">{formatCurrencyLkr(row.revenue_lkr)}</td>
									<td className="num mono">{formatCurrencyLkr(row.total_cost_lkr)}</td>
									<td className={`num mono ${row.gross_profit_lkr >= 0 ? 'toneGood' : 'toneBad'}`}>
										{formatCurrencyLkr(row.gross_profit_lkr)}
									</td>
									<td className="num mono">{formatNumber(row.gross_margin_pct, { maximumFractionDigits: 1 })}%</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<div className="costLegend">
					<span>
						<i style={{ background: 'rgba(34, 197, 94, 0.85)' }} /> Feed
					</span>
					<span>
						<i style={{ background: 'rgba(59, 130, 246, 0.85)' }} /> Energy
					</span>
					<span>
						<i style={{ background: 'rgba(234, 179, 8, 0.9)' }} /> Labor
					</span>
					<span>
						<i style={{ background: 'rgba(139, 92, 246, 0.85)' }} /> Other (med + maint)
					</span>
				</div>
			</section>

			<section className="panel spanAll" style={{ marginTop: 12 }}>
				<div className="panelTitle">Savings opportunities</div>
				{savings.length === 0 ? (
					<div className="emptyState" style={{ padding: '16px 0' }}>
						No savings suggestions for this filter. Try &quot;All ponds&quot; or refresh the dashboard.
					</div>
				) : (
					<ul className="costSavingsList">
						{savings.map((s) => (
							<li key={s.id} className="costSavingsItem">
								<div className="costSavingsTop">
									<span className={priorityBadgeClass(s.priority)}>{s.priority}</span>
									<span className="mono costSavingsAmt">{formatCurrencyLkr(s.savings_lkr)}</span>
								</div>
								<div className="costSavingsTitle">{s.title}</div>
								<div className="muted costSavingsDesc">{s.description}</div>
								<div className="costSavingsMeta">
									<span>{s.source}</span>
									<span>· {s.period}</span>
									{s.pond_id != null ? <span>· Pond {s.pond_id}</span> : null}
									<span>· {s.category}</span>
								</div>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	)
}
