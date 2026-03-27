import { useCallback, useEffect, useRef, useState } from 'react'
import type { HistoryApiResponse } from './types'

type State = {
	data: HistoryApiResponse | null
	loading: boolean
	error: string | null
}

export function useHistoryData(params: { limit?: number; days?: number }) {
	const { limit, days } = params
	const [state, setState] = useState<State>({ data: null, loading: false, error: null })
	const abortRef = useRef<AbortController | null>(null)

	const load = useCallback(async () => {
		abortRef.current?.abort()
		const controller = new AbortController()
		abortRef.current = controller

		setState((s) => ({ ...s, loading: true, error: null }))
		try {
			// Build query params - prefer days if provided
			const queryParams = new URLSearchParams()
			if (days !== undefined) {
				queryParams.set('days', String(days))
			} else if (limit !== undefined) {
				queryParams.set('limit', String(limit))
			}
			
			const res = await fetch(`/api/history?${queryParams.toString()}`, {
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
	}, [limit, days])

	useEffect(() => {
		void load()
		return () => abortRef.current?.abort()
	}, [load])

	return { ...state, refresh: load }
}


