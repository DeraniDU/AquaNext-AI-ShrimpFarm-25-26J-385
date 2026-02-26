import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
		async (opts?: { fresh?: boolean }) => {
			abortRef.current?.abort()
			const controller = new AbortController()
			abortRef.current = controller

			setState((s) => ({ ...s, loading: true, error: null }))
			
			// Simulate API delay
			await new Promise(resolve => setTimeout(resolve, 300))
			
			if (controller.signal.aborted) return
			
			try {
				// Generate mock data instead of calling API
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
		// User-initiated refresh should generate fresh mock data.
		await load({ fresh: true })
	}, [load])

	const initialLoad = useCallback(async () => {
		// Initial mount (or ponds change) should generate mock data.
		await load({ fresh: false })
	}, [load])

	useEffect(() => {
		void initialLoad()
		return () => abortRef.current?.abort()
	}, [initialLoad])

	useEffect(() => {
		if (!autoRefreshMs) return
		// Auto-refresh should generate fresh mock data.
		const t = window.setInterval(() => void load({ fresh: true }), autoRefreshMs)
		return () => window.clearInterval(t)
	}, [autoRefreshMs, load])

	return { ...state, refresh }
}

