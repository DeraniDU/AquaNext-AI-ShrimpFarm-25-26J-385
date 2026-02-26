import { useState, useEffect } from 'react'
import type { ForecastsResponse } from './types'
import { generateMockForecastsData } from './mockData'

type UseForecastsDataOptions = {
	ponds?: number
	forecastDays?: number
	autoRefreshMs?: number | null
}

export function useForecastsData(options: UseForecastsDataOptions = {}) {
	const { ponds = 4, forecastDays = 90, autoRefreshMs = null } = options
	const [data, setData] = useState<ForecastsResponse | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

	const fetchForecasts = async () => {
		setLoading(true)
		setError(null)

		try {
			// Simulate API delay
			await new Promise(resolve => setTimeout(resolve, 400))
			
			// Generate mock forecasts data instead of calling API
			const mockData = generateMockForecastsData(ponds, forecastDays)
			setData(mockData)
			setLastUpdatedAt(new Date())
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			setError(message)
			console.error('Failed to fetch forecasts:', err)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		void fetchForecasts()
	}, [ponds, forecastDays])

	useEffect(() => {
		if (autoRefreshMs && autoRefreshMs > 0) {
			const interval = setInterval(() => {
				void fetchForecasts()
			}, autoRefreshMs)
			return () => clearInterval(interval)
		}
	}, [autoRefreshMs])

	return {
		data,
		loading,
		error,
		lastUpdatedAt,
		refresh: fetchForecasts
	}
}

