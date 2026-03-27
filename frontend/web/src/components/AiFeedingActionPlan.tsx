import type { FeedingOptimizationResponse, FeedingPlan, WaterQualityData } from '../lib/types'
import { formatNumber, formatDateTime } from '../lib/format'

type Props = {
	feedingOpt: FeedingOptimizationResponse | null
	water: WaterQualityData[]
	loading: boolean
	error: string | null
	onRefresh: () => void
	/** True when optimization was requested with dashboard water_quality + feed (POST) — LLM uses DB/live data */
	usesLiveData?: boolean
}

function pondStatusLabel(wq: WaterQualityData | undefined): { label: string; tone: 'optimal' | 'caution' } {
	if (!wq) return { label: 'Optimal', tone: 'optimal' }
	if (wq.status === 'poor' || wq.status === 'critical') return { label: 'Adjust', tone: 'caution' }
	if (wq.status === 'fair') return { label: 'Monitor', tone: 'caution' }
	return { label: 'Optimal', tone: 'optimal' }
}

function formatFcr(n: number): string {
	if (!Number.isFinite(n) || n <= 0) return '—'
	if (n > 99) return formatNumber(n, { maximumFractionDigits: 1 })
	return formatNumber(n, { maximumFractionDigits: 2 })
}

function planDailyGrams(plan: FeedingPlan): number {
	const kg = plan.daily_feed_kg > 0 ? plan.daily_feed_kg : plan.current_daily_feed_kg
	return Math.max(0, Math.round(kg * 1000))
}

export function AiFeedingActionPlan({
	feedingOpt,
	water,
	loading,
	error,
	onRefresh,
	usesLiveData = false
}: Props) {
	const plans = feedingOpt?.plans ?? []
	const timestamp = feedingOpt?.timestamp

	return (
		<div
			className="panel"
			style={{
				marginBottom: 20,
				overflow: 'hidden',
				border: '2px solid rgba(16, 185, 129, 0.25)',
				background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.06) 0%, rgba(255,255,255,0.95) 40%)'
			}}
		>
			{/* Header */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					flexWrap: 'wrap',
					gap: 12,
					padding: '14px 18px',
					borderBottom: '1px solid rgba(17, 24, 39, 0.06)'
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
					<span style={{ fontSize: 22 }}>🤖</span>
					<h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
						AI Action Plan
					</h2>
					{usesLiveData && (
						<span
							style={{
								fontSize: 11,
								fontWeight: 600,
								padding: '2px 8px',
								borderRadius: 6,
								background: 'rgba(16, 185, 129, 0.15)',
								color: '#15803d'
							}}
						>
							DB + LLM
						</span>
					)}
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
					{timestamp && (
						<span style={{ fontSize: 13, color: 'var(--muted)' }}>
							Updated {formatDateTime(timestamp)}
						</span>
					)}
					{loading && <span style={{ fontSize: 13, color: 'var(--muted)' }}>Updating…</span>}
					<button
						type="button"
						onClick={() => void onRefresh()}
						disabled={loading}
						style={{
							padding: '8px 14px',
							fontSize: 13,
							fontWeight: 600,
							cursor: loading ? 'not-allowed' : 'pointer',
							borderRadius: 8,
							border: '1px solid rgba(16, 185, 129, 0.4)',
							background: 'rgba(255,255,255,0.9)',
							color: '#15803d'
						}}
					>
						Refresh
					</button>
				</div>
			</div>

			{error && (
				<div style={{ padding: '12px 18px', color: '#b91c1c', fontSize: 14 }}>
					Could not load action plan: {error}
				</div>
			)}

			{!error && plans.length === 0 && !loading && (
				<div style={{ padding: '20px 18px', color: 'var(--muted)', fontSize: 14 }}>
					No feeding plan yet. Load dashboard data and refresh — the optimizer uses your water quality and feed
					data (POST) when available so the LLM can recommend from real farm data.
				</div>
			)}

			{/* Pond cards */}
			{plans.length > 0 && (
				<div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
					{plans.map((plan) => {
						const wq = water.find((w) => w.pond_id === plan.pond_id)
						const { label: statusLabel, tone } = pondStatusLabel(wq)
						const dailyG = planDailyGrams(plan)
						const feedTypeShort = (plan.feed_type || 'Standard Feed').split('(')[0].trim()

						return (
							<div
								key={plan.pond_id}
								style={{
									padding: '14px 16px',
									borderRadius: 12,
									background: 'rgba(16, 185, 129, 0.08)',
									border: '1px solid rgba(16, 185, 129, 0.18)'
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
									<span style={{ fontSize: 18 }}>💡</span>
									<span style={{ fontWeight: 700, color: 'var(--text)' }}>
										Pond {plan.pond_id}
									</span>
									<span
										style={{
											fontWeight: 600,
											color: tone === 'optimal' ? '#16a34a' : '#ca8a04',
											fontSize: 14
										}}
									>
										— {statusLabel}
									</span>
								</div>
								<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
									<span style={{ fontSize: 16 }}>⚡</span>
									<span style={{ fontWeight: 600, color: '#c2410c' }}>{feedTypeShort}</span>
								</div>
								<div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>
									<strong>Daily:</strong> {dailyG} g
								</div>
								<div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
									FCR {formatFcr(plan.fcr_current)} → {formatFcr(plan.fcr_target)}
								</div>
								<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
									{(plan.schedule || []).slice(0, 5).map((s, i) => (
										<div
											key={`${plan.pond_id}-${s.time}-${i}`}
											style={{ fontSize: 13, color: 'var(--text)', display: 'flex', gap: 8, alignItems: 'flex-start' }}
										>
											<span style={{ color: '#16a34a' }}>✔</span>
											<span>
												<strong>{s.time}</strong> — {Math.round(s.amount_g)} g {s.notes || ''}
											</span>
										</div>
									))}
								</div>
							</div>
						)
					})}
				</div>
			)}

			{/* Farm-wide summary */}
			{feedingOpt && plans.length > 0 && (
				<div
					style={{
						padding: '16px 18px',
						borderTop: '1px solid rgba(17, 24, 39, 0.06)',
						background: 'rgba(255,255,255,0.6)'
					}}
				>
					<div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
						Farm-wide summary
					</div>
					<div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 8 }}>
						Overall FCR: <strong>{formatFcr(feedingOpt.overall_fcr)}</strong>
						{feedingOpt.potential_savings_pct > 0 && (
							<>
								{' '}
								<span style={{ color: '#16a34a' }}>↓</span>{' '}
								{formatNumber(feedingOpt.potential_savings_pct, { maximumFractionDigits: 1 })}% feed saving vs
								current
							</>
						)}
					</div>
					{feedingOpt.top_recommendation && (
						<div style={{ fontSize: 14, color: 'var(--text)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
							<span>🏆</span>
							<span>{feedingOpt.top_recommendation}</span>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
