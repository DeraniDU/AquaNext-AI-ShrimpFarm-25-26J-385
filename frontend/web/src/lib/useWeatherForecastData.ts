import { useCallback, useEffect, useState } from 'react'
import type { WeatherForecastResponse } from './types'

type UseWeatherForecastDataOptions = {
	latitude?: number
	longitude?: number
	hours?: number
	days?: number
	enabled?: boolean
	autoRefreshMs?: number | null
}

export function useWeatherForecastData(options: UseWeatherForecastDataOptions = {}) {
	const {
		latitude,
		longitude,
		hours = 48,
		days = 3,
		enabled = true,
		autoRefreshMs = null
	} = options

	const [data, setData] = useState<WeatherForecastResponse | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

	const fetchWeatherForecast = useCallback(async () => {
		if (!enabled) return
		setLoading(true)
		setError(null)

		try {
			const params = new URLSearchParams({
				hours: String(hours),
				days: String(days)
			})
			if (latitude != null) params.set('latitude', String(latitude))
			if (longitude != null) params.set('longitude', String(longitude))

			const response = await fetch(`/api/weather-forecast?${params.toString()}`)
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}

			const json = (await response.json()) as WeatherForecastResponse
			setData(json)
			setLastUpdatedAt(new Date())
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			setError(message)
			console.error('Failed to fetch weather forecast:', err)
		} finally {
			setLoading(false)
		}
	}, [enabled, hours, days, latitude, longitude])

	useEffect(() => {
		void fetchWeatherForecast()
	}, [fetchWeatherForecast])

	useEffect(() => {
		if (autoRefreshMs && autoRefreshMs > 0 && enabled) {
			const interval = setInterval(() => {
				void fetchWeatherForecast()
			}, autoRefreshMs)
			return () => clearInterval(interval)
		}
	}, [autoRefreshMs, enabled, fetchWeatherForecast])

	return {
		data,
		loading,
		error,
		lastUpdatedAt,
		refresh: fetchWeatherForecast
	}
}
