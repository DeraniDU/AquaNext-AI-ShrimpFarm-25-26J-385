import { useCallback, useEffect, useState } from 'react'

type DiseaseRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN'

type PondRisk = {
	pond_id: number
	risk_level: DiseaseRiskLevel
	supervised_risk: DiseaseRiskLevel | null
	unsupervised_risk: DiseaseRiskLevel | null
	combined_score: number | null
	timestamp: string | null
}

type State = {
	data: PondRisk[] | null
	loading: boolean
	error: string | null
}

const DEFAULT_API_BASE = 'http://localhost:8001'

export function useDiseaseRisk(pondIds: number[]) {
	const [state, setState] = useState<State>({ data: null, loading: false, error: null })

	const load = useCallback(async () => {
		if (!pondIds.length) {
			setState({ data: [], loading: false, error: null })
			return
		}

		setState((s) => ({ ...s, loading: true, error: null }))

		try {
			const base = (import.meta as any).env?.VITE_DISEASE_API_BASE ?? DEFAULT_API_BASE

			const responses = await Promise.all(
				pondIds.map(async (pondId) => {
					const res = await fetch(`${base}/pond-status/${pondId}`)
					if (!res.ok) {
						throw new Error(`Failed to load pond status for pond ${pondId}: ${res.status}`)
					}
					const json = await res.json()
					const latest = json.latest_prediction

					let combined_score: number | null = null
					let supervised: DiseaseRiskLevel | null = null
					let unsupervised: DiseaseRiskLevel | null = null
					let level: DiseaseRiskLevel = 'UNKNOWN'

					if (latest && latest.prediction_result) {
						const pr = latest.prediction_result
						combined_score =
							typeof pr.combined_risk_score === 'number' ? pr.combined_risk_score : null
						supervised = (pr.supervised_prediction as DiseaseRiskLevel) ?? null
						unsupervised = (pr.unsupervised_prediction as DiseaseRiskLevel) ?? null

						if (typeof combined_score === 'number') {
							if (combined_score < 0.33) level = 'LOW'
							else if (combined_score < 0.66) level = 'MEDIUM'
							else level = 'HIGH'
						} else if (supervised) {
							level = supervised
						}
					}

					return {
						pond_id: pondId,
						risk_level: level,
						supervised_risk: supervised,
						unsupervised_risk: unsupervised,
						combined_score,
						timestamp: latest?.timestamp ?? null
					} as PondRisk
				})
			)

			setState({ data: responses, loading: false, error: null })
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Failed to load disease risk'
			setState((s) => ({ ...s, loading: false, error: message }))
		}
	}, [pondIds])

	useEffect(() => {
		void load()
	}, [load])

	return { ...state, refresh: load }
}

