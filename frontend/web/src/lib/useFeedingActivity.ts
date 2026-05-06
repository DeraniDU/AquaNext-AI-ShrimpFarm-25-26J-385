import { useCallback, useEffect, useRef, useState } from 'react'

export type FeedingActivityResponse = {
	labels: string[]
	data: number[]
	source?: 'mongodb' | 'none' | 'error'
	error?: string
}

const FALLBACK_LABELS = ['7 AM', '9 AM', '11 AM', '1 PM', '3 PM', '5 PM', '6 PM']
const FALLBACK_DATA = [32, 35, 38, 42, 48, 45, 40]

type State = {
	labels: string[]
	data: number[]
	loading: boolean
	error: string | null
	source: 'mongodb' | 'fallback'
}

/**
 * Fetches feeding activity by hour from MongoDB (GET /api/feeding-activity).
 * Uses fallback static data when API fails or returns all zeros.
 */
export function useFeedingActivity(pondId: number | null, hours = 24) {
	const [state, setState] = useState<State>({
		labels: FALLBACK_LABELS,
		data: FALLBACK_DATA,
		loading: true,
		error: null,
		source: 'fallback',
	})
	const abortRef = useRef<AbortController | null>(null)

	const load = useCallback(async () => {
		abortRef.current?.abort()
		const controller = new AbortController()
		abortRef.current = controller

		setState((s) => ({ ...s, loading: true, error: null }))
		try {
			const params = new URLSearchParams({ hours: String(hours) })
			if (pondId != null) params.set('pond_id', String(pondId))
			const res = await fetch(`/api/feeding-activity?${params}`, {
				signal: controller.signal,
			})
			const json = (await res.json()) as FeedingActivityResponse
			if (!res.ok) throw new Error(json?.error ?? `API ${res.status}`)

			const hasData = json.data?.length && json.data.some((v) => v > 0)
			if (hasData && json.source === 'mongodb') {
				setState({
					labels: json.labels ?? FALLBACK_LABELS,
					data: json.data,
					loading: false,
					error: null,
					source: 'mongodb',
				})
			} else {
				setState({
					labels: FALLBACK_LABELS,
					data: FALLBACK_DATA,
					loading: false,
					error: null,
					source: 'fallback',
				})
			}
		} catch (e) {
			if (controller.signal.aborted) return
			const message = e instanceof Error ? e.message : 'Failed to load feeding activity'
			setState({
				labels: FALLBACK_LABELS,
				data: FALLBACK_DATA,
				loading: false,
				error: message,
				source: 'fallback',
			})
		}
	}, [pondId, hours])

	useEffect(() => {
		void load()
		return () => abortRef.current?.abort()
	}, [load])

	return { ...state, refresh: load }
}
