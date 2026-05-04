import { useCallback, useEffect, useRef, useState } from 'react'
import type { HistoryApiResponse } from './types'

type State = {
	data: HistoryApiResponse | null
	loading: boolean
	error: string | null
}

export function useHourlyHistoryData(params: { hours?: number }) {
	const { hours = 24 } = params
	const [state, setState] = useState<State>({ data: null, loading: false, error: null })
	const abortRef = useRef<AbortController | null>(null)

	const load = useCallback(async () => {
		abortRef.current?.abort()
		const controller = new AbortController()
		abortRef.current = controller

		setState((s) => ({ ...s, loading: true, error: null }))
		try {
			const queryParams = new URLSearchParams()
			queryParams.set('hours', String(hours))
			
			const res = await fetch(`/api/history/hourly?${queryParams.toString()}`, {
				signal: controller.signal,
				cache: 'no-store'
			})
			if (!res.ok) throw new Error(`API ${res.status}`)
			const json = (await res.json()) as HistoryApiResponse
			setState({ data: json, loading: false, error: null })
		} catch (e) {
			if (controller.signal.aborted) return
			const message = e instanceof Error ? e.message : 'Failed to load'
			setState((s) => ({ ...s, loading: false, error: message }))
		}
	}, [hours])

	useEffect(() => {
		void load()
		return () => abortRef.current?.abort()
	}, [load])

	return { ...state, refresh: load }
}
