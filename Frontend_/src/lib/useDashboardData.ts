import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DashboardApiResponse } from './types'

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

	const baseUrl = useMemo(() => `/api/dashboard?ponds=${encodeURIComponent(String(ponds))}`, [ponds])

	const load = useCallback(
		async (opts?: { fresh?: boolean }) => {
			const fresh = Boolean(opts?.fresh)
			const url = fresh ? `${baseUrl}&fresh=1` : baseUrl

			abortRef.current?.abort()
			const controller = new AbortController()
			abortRef.current = controller

			setState((s) => ({ ...s, loading: true, error: null }))
			try {
				const res = await fetch(url, {
					signal: controller.signal,
					// Prevent browser cache so Refresh always gets latest KPIs from server
					...(fresh ? { cache: 'no-store' as RequestCache } : {}),
				})
				const json = await res.json().catch(() => null)
				if (!res.ok) {
					const detail = json?.detail ?? (typeof json === 'string' ? json : null)
					throw new Error(detail ? `API ${res.status}: ${detail}` : `API ${res.status}`)
				}
				setState({ data: json as DashboardApiResponse, loading: false, error: null, lastUpdatedAt: new Date().toISOString() })
			} catch (e) {
				if (controller.signal.aborted) return
				const message = e instanceof Error ? e.message : 'Failed to load'
				setState((s) => ({ ...s, loading: false, error: message }))
			}
		},
		[baseUrl]
	)

	const refresh = useCallback(async () => {
		// User-initiated refresh should request a fresh snapshot from the API.
		await load({ fresh: true })
	}, [load])

	const initialLoad = useCallback(async () => {
		// Initial mount (or ponds change) should use cached snapshot for stability across reloads.
		await load({ fresh: false })
	}, [load])

	useEffect(() => {
		void initialLoad()
		return () => abortRef.current?.abort()
	}, [initialLoad])

	useEffect(() => {
		if (!autoRefreshMs) return
		// Auto-refresh should request fresh snapshots.
		const t = window.setInterval(() => void load({ fresh: true }), autoRefreshMs)
		return () => window.clearInterval(t)
	}, [autoRefreshMs, load])

	return { ...state, refresh }
}

