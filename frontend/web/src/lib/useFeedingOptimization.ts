import { useCallback, useEffect, useRef, useState } from 'react'
import type { FeedingOptimizationResponse } from './types'

type State = {
	data: FeedingOptimizationResponse | null
	loading: boolean
	error: string | null
}

export function useFeedingOptimization(ponds: number) {
	const [state, setState] = useState<State>({ data: null, loading: false, error: null })
	const abortRef = useRef<AbortController | null>(null)

	const load = useCallback(async () => {
		abortRef.current?.abort()
		const controller = new AbortController()
		abortRef.current = controller

		setState((s) => ({ ...s, loading: true, error: null }))
		try {
			const res = await fetch(`/api/feeding-optimization?ponds=${encodeURIComponent(String(ponds))}`, {
				signal: controller.signal
			})
			if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
			const json = (await res.json()) as FeedingOptimizationResponse
			setState({ data: json, loading: false, error: null })
		} catch (e) {
			if (controller.signal.aborted) return
			const message = e instanceof Error ? e.message : 'Failed to load feeding optimization'
			setState((s) => ({ ...s, loading: false, error: message }))
		}
	}, [ponds])

	const refresh = useCallback(async () => {
		await load()
	}, [load])

	useEffect(() => {
		void load()
		return () => abortRef.current?.abort()
	}, [load])

	return { ...state, refresh }
}
