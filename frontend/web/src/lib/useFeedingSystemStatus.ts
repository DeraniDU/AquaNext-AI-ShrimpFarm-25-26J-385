import { useCallback, useState } from 'react'

export type GatewayStatus = {
	gatewayOk: boolean
	feedingSystemOk: boolean
	loading: boolean
	error: string | null
	lastCheckedAt: string | null
}

/**
 * Checks whether the API gateway and the feeding-system backend are reachable.
 * Uses GET /api/health for the gateway and GET /api/feeding-system/batch for feeding-system (via gateway).
 */
export function useFeedingSystemStatus() {
	const [status, setStatus] = useState<GatewayStatus>({
		gatewayOk: false,
		feedingSystemOk: false,
		loading: false,
		error: null,
		lastCheckedAt: null,
	})

	const check = useCallback(async () => {
		setStatus((s) => ({ ...s, loading: true, error: null }))
		try {
			// 1. Check API gateway is up
			const healthRes = await fetch('/api/health', { cache: 'no-store' })
			const gatewayOk = healthRes.ok
			if (healthRes.ok) {
				try {
					await healthRes.json()
				} catch {
					// ignore
				}
			}

			// 2. Check feeding-system via gateway (GET /api/feeding-system/batch)
			let feedingSystemOk = false
			if (gatewayOk) {
				const batchRes = await fetch('/api/feeding-system/batch', { cache: 'no-store' })
				feedingSystemOk = batchRes.ok
			}

			setStatus({
				gatewayOk,
				feedingSystemOk,
				loading: false,
				error: null,
				lastCheckedAt: new Date().toISOString(),
			})
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Check failed'
			setStatus((s) => ({
				...s,
				loading: false,
				error: message,
				gatewayOk: false,
				feedingSystemOk: false,
			}))
		}
	}, [])

	return { ...status, check }
}
