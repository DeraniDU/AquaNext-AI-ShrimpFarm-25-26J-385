import { useCallback, useEffect, useRef, useState } from 'react'
import type { DashboardApiResponse } from './types'
import { generateMockDashboardData } from './mockData'

type State = {
	data: DashboardApiResponse | null
	loading: boolean
	error: string | null
	lastUpdatedAt: string | null
}

export function useDashboardData(params: { ponds: number; autoRefreshMs: number | null }) {
	const { ponds, autoRefreshMs } = params
	const [state, setState] = useState<State>({ data: null, loading: false, error: null, lastUpdatedAt: null })
	const abortRef = useRef<AbortController | null>(null)

	const load = useCallback(
		async () => {
			abortRef.current?.abort()
			const controller = new AbortController()
			abortRef.current = controller
			setState((s) => ({ ...s, loading: true, error: null }))
			await new Promise((resolve) => setTimeout(resolve, 300))
			if (controller.signal.aborted) return
			try {
				const mockData = generateMockDashboardData(ponds)
				setState({ data: mockData, loading: false, error: null, lastUpdatedAt: new Date().toISOString() })
			} catch (e) {
				if (controller.signal.aborted) return
				const message = e instanceof Error ? e.message : 'Failed to load'
				setState((s) => ({ ...s, loading: false, error: message }))
			}
		},
		[ponds]
	)

	const refresh = useCallback(async () => {
		await load()
	}, [load])

	useEffect(() => {
		void load()
		return () => abortRef.current?.abort()
	}, [load])

	useEffect(() => {
		if (!autoRefreshMs) return
		const t = window.setInterval(() => void load(), autoRefreshMs)
		return () => window.clearInterval(t)
	}, [autoRefreshMs, load])

	return { ...state, refresh }
}
