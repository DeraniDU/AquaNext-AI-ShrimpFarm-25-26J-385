import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import type { WaterQualityData } from './types'

export type WaterQualityApiResponse = {
	water_quality: WaterQualityData[]
	timestamp: string
}

type State = {
	data: WaterQualityApiResponse | null
	loading: boolean
	error: string | null
}

export function useWaterQualityData(params: { ponds: number; autoRefreshMs: number | null }) {
	const { ponds, autoRefreshMs } = params
	const [state, setState] = useState<State>({ data: null, loading: false, error: null })
	const abortRef = useRef<AbortController | null>(null)

	const baseUrl = useMemo(() => `/api/water-quality?ponds=${encodeURIComponent(String(ponds))}`, [ponds])

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
			const json = (await res.json()) as WaterQualityApiResponse
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
