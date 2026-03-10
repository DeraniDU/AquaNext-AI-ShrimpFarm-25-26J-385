import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import type { FeedData } from './types'

export type FeedingDataApiResponse = {
	feed: FeedData[]
	feed_efficiency: number
	timestamp: string
}

type State = {
	data: FeedingDataApiResponse | null
	loading: boolean
	error: string | null
}

export function useFeedingData(params: { ponds: number; autoRefreshMs: number | null }) {
	const { ponds, autoRefreshMs } = params
	const [state, setState] = useState<State>({ data: null, loading: false, error: null })
	const abortRef = useRef<AbortController | null>(null)

	const baseUrl = useMemo(() => `/api/feeding-data?ponds=${encodeURIComponent(String(ponds))}`, [ponds])

	const load = useCallback(async () => {
		abortRef.current?.abort()
		const controller = new AbortController()
		abortRef.current = controller

		setState((s) => ({ ...s, loading: true, error: null }))
		try {
			const res = await fetch(baseUrl, {
				signal: controller.signal,
				cache: 'no-store'
			})
			if (!res.ok) throw new Error(`API ${res.status}`)
			const json = (await res.json()) as FeedingDataApiResponse
			setState({ data: json, loading: false, error: null })
		} catch (e) {
			if (controller.signal.aborted) return
			const message = e instanceof Error ? e.message : 'Failed to load'
			setState((s) => ({ ...s, loading: false, error: message }))
		}
	}, [baseUrl])

	useEffect(() => {
		void load()
		return () => abortRef.current?.abort()
	}, [load])

	useEffect(() => {
		if (!autoRefreshMs) return
		const t = window.setInterval(() => void load(), autoRefreshMs)
		return () => window.clearInterval(t)
	}, [autoRefreshMs, load])

	return { ...state, refresh: load }
}
