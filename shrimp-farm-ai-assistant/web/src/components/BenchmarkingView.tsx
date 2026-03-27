import { useBenchmark } from '../lib/useBenchmark'
import type { BenchmarkComparisons, BenchmarkResult } from '../lib/types'
import { formatDateTime } from '../lib/format'

type Props = {
	ponds?: number
}

function ScoreRing({ label, score, color }: { label: string; score: number; color: string }) {
	const radius = 36
	const circumference = radius * 2 * Math.PI
	const offset = circumference - (score / 100) * circumference
	return (
		<div className="benchmarkScoreRing">
			<svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)' }}>
				<circle
					cx="44"
					cy="44"
					r={radius}
					fill="none"
					stroke="var(--border)"
					strokeWidth="8"
				/>
				<circle
					cx="44"
					cy="44"
					r={radius}
					fill="none"
					stroke={color}
					strokeWidth="8"
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					strokeLinecap="round"
					style={{ transition: 'stroke-dashoffset 0.4s ease' }}
				/>
			</svg>
			<div className="benchmarkScoreValue" style={{ color }}>{Math.round(score)}</div>
			<div className="benchmarkScoreLabel">{label}</div>
		</div>
	)
}

function scoreColor(score: number): string {
	if (score >= 80) return 'var(--good)'
	if (score >= 60) return 'var(--warn)'
	return 'var(--bad)'
}

export function BenchmarkingView({ ponds = 4 }: Props) {
	const { data, loading, error, lastUpdatedAt, refresh } = useBenchmark({ ponds })

	if (error) {
		return (
			<div className="card">
				<div className="cardInner">
					<div className="cardHeader">
						<h2>Benchmark error</h2>
						<span className="badge bad">API</span>
					</div>
					<p className="muted">{error}</p>
					<button onClick={() => void refresh()}>Retry</button>
				</div>
			</div>
		)
	}

	if (loading && !data) {
		return (
			<div className="card">
				<div className="cardInner">
					<div className="cardHeader">
						<h2>Benchmarking</h2>
					</div>
					<p className="muted">Running benchmark and AI analysis…</p>
				</div>
			</div>
		)
	}

	const benchmark: BenchmarkResult | undefined = data?.benchmark
	if (!benchmark) {
		return (
			<div className="card">
				<div className="cardInner">
					<div className="cardHeader">
						<h2>Benchmarking</h2>
					</div>
					<p className="muted">No benchmark data. Click Refresh to run.</p>
					<button onClick={() => void refresh()}>Refresh</button>
				</div>
			</div>
		)
	}

	const { scores, comparisons, ai_analysis, ai_recommendations } = benchmark

	return (
		<div className="benchmarkingView">
			<div className="card">
				<div className="cardInner">
					<div className="cardHeader">
						<h2>Performance benchmark</h2>
						<div className="benchmarkHeaderMeta">
							<span className="badge good">Scores</span>
							{lastUpdatedAt && (
								<span className="muted">Updated {formatDateTime(lastUpdatedAt)}</span>
							)}
							<button onClick={() => void refresh()} disabled={loading}>
								{loading ? 'Refreshing…' : 'Refresh'}
							</button>
						</div>
					</div>
					<p className="muted">
						Farm performance vs targets and best practices. AI analysis runs when OPENAI_API_KEY is set.
					</p>

					<section className="benchmarkScores">
						<h3>Benchmark scores (0–100)</h3>
						<div className="benchmarkScoresGrid">
							<ScoreRing
								label="Overall"
								score={scores.overall}
								color={scoreColor(scores.overall)}
							/>
							<ScoreRing
								label="Water quality"
								score={scores.water_quality}
								color={scoreColor(scores.water_quality)}
							/>
							<ScoreRing
								label="Feed"
								score={scores.feed}
								color={scoreColor(scores.feed)}
							/>
							<ScoreRing
								label="Energy"
								score={scores.energy}
								color={scoreColor(scores.energy)}
							/>
							<ScoreRing
								label="Labor"
								score={scores.labor}
								color={scoreColor(scores.labor)}
							/>
						</div>
					</section>

					<section className="benchmarkComparisons">
						<h3>Current vs target</h3>
						<div className="benchmarkComparisonsGrid">
							<ComparisonCard title="Water quality" data={comparisons.water_quality} />
							<ComparisonCard title="Feed" data={comparisons.feed} />
							<ComparisonCard title="Energy" data={comparisons.energy} />
							<ComparisonCard title="Labor" data={comparisons.labor} />
						</div>
					</section>

					{ai_recommendations.length > 0 && (
						<section className="benchmarkRecommendations">
							<h3>Recommendations</h3>
							<ul className="benchmarkRecommendationsList">
								{ai_recommendations.map((rec, i) => (
									<li key={i}>{rec}</li>
								))}
							</ul>
						</section>
					)}

					{ai_analysis && (
						<section className="benchmarkAiAnalysis">
							<h3>AI analysis</h3>
							<pre className="benchmarkAiAnalysisText">{ai_analysis}</pre>
						</section>
					)}
				</div>
			</div>
		</div>
	)
}

function ComparisonCard({
	title,
	data,
}: {
	title: string
	data: BenchmarkComparisons['water_quality'] | BenchmarkComparisons['feed'] | BenchmarkComparisons['energy'] | BenchmarkComparisons['labor']
}) {
	const wq = 'ph' in data && 'temperature' in data
	const feed = 'ponds' in data && 'total_feed_kg' in data
	const energy = 'total_kwh' in data && 'avg_efficiency' in data
	const labor = 'total_hours' in data && 'total_workers' in data

	return (
		<div className="benchmarkComparisonCard">
			<h4>{title}</h4>
			<dl className="benchmarkComparisonDl">
				{wq && (
					<>
						<dt>pH</dt>
						<dd>{(data as BenchmarkComparisons['water_quality']).ph.current ?? '—'} (target: {(data as BenchmarkComparisons['water_quality']).ph.target})</dd>
						<dt>Temperature</dt>
						<dd>{(data as BenchmarkComparisons['water_quality']).temperature.current ?? '—'} °C (target: {(data as BenchmarkComparisons['water_quality']).temperature.target})</dd>
						<dt>Dissolved O₂</dt>
						<dd>{(data as BenchmarkComparisons['water_quality']).dissolved_oxygen.current ?? '—'} (min: {(data as BenchmarkComparisons['water_quality']).dissolved_oxygen.target_min})</dd>
					</>
				)}
				{feed && (
					<>
						<dt>Ponds</dt>
						<dd>{(data as BenchmarkComparisons['feed']).ponds}</dd>
						<dt>Total feed (kg)</dt>
						<dd>{(data as BenchmarkComparisons['feed']).total_feed_kg}</dd>
						<dt>Avg weight (g)</dt>
						<dd>{(data as BenchmarkComparisons['feed']).avg_weight_g ?? '—'}</dd>
					</>
				)}
				{energy && (
					<>
						<dt>Total (kWh)</dt>
						<dd>{(data as BenchmarkComparisons['energy']).total_kwh}</dd>
						<dt>Cost</dt>
						<dd>{(data as BenchmarkComparisons['energy']).total_cost}</dd>
						<dt>Avg efficiency</dt>
						<dd>{(data as BenchmarkComparisons['energy']).avg_efficiency ?? '—'}</dd>
					</>
				)}
				{labor && (
					<>
						<dt>Total hours</dt>
						<dd>{(data as BenchmarkComparisons['labor']).total_hours}</dd>
						<dt>Workers</dt>
						<dd>{(data as BenchmarkComparisons['labor']).total_workers}</dd>
						<dt>Avg efficiency</dt>
						<dd>{(data as BenchmarkComparisons['labor']).avg_efficiency ?? '—'}</dd>
					</>
				)}
			</dl>
		</div>
	)
}
