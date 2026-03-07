import { useCallback, useEffect, useState } from 'react'
import type { FeedingSystemBatch, FeedingSystemMotorStatus } from './types'

const FEEDING_SYSTEM_BATCH_URL = '/api/feeding-system/batch'
const FEEDING_SYSTEM_MOTOR_STATUS_URL = '/api/feeding-system/motor/status'

export type FeedingSystemData = {
	batches: FeedingSystemBatch[]
	motorStatus: FeedingSystemMotorStatus | null
}

export function useFeedingSystemBatches() {
	const [data, setData] = useState<FeedingSystemData>({ batches: [], motorStatus: null })
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const fetchData = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const [batchRes, motorRes] = await Promise.all([
				fetch(FEEDING_SYSTEM_BATCH_URL, { cache: 'no-store' }),
				fetch(FEEDING_SYSTEM_MOTOR_STATUS_URL, { cache: 'no-store' })
			])

			const batches: FeedingSystemBatch[] = batchRes.ok ? await batchRes.json() : []
			let motorStatus: FeedingSystemMotorStatus | null = null
			if (motorRes.ok) {
				try {
					const motorJson = (await motorRes.json()) as { status?: string; data?: FeedingSystemMotorStatus }
					if (motorJson.data) motorStatus = motorJson.data
				} catch {
					// ignore
				}
			}

			setData({ batches: Array.isArray(batches) ? batches : [], motorStatus })
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Failed to load feeding system data'
			setError(message)
			setData({ batches: [], motorStatus: null })
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchData()
	}, [fetchData])

	return { data, loading, error, refresh: fetchData }
}
