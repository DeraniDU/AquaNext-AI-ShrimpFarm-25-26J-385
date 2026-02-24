import { useCallback, useEffect, useRef, useState } from 'react'
import type { HistoryApiResponse } from './types'
import { generateMockHistoryData } from './mockData'

type State = {
	data: HistoryApiResponse | null
	loading: boolean
	error: string | null
}

export function useHistoryData(params: { limit?: number; days?: number }) {
	const { limit, days } = params
	const [state, setState] = useState<State>({ data: null, loading: false, error: null })
	const abortRef = useRef<AbortController | null>(null)

	const load = useCallback(async () => {
		abortRef.current?.abort()
		const controller = new AbortController()
		abortRef.current = controller

		setState((s) => ({ ...s, loading: true, error: null }))
		
		// Simulate API delay
		await new Promise(resolve => setTimeout(resolve, 200))
		
		if (controller.signal.aborted) return
		
		try {
			// Generate mock history data instead of calling API
			const historyDays = days !== undefined ? days : 7
			const mockData = generateMockHistoryData(historyDays)
			
			// Apply limit if specified
			if (limit !== undefined && limit > 0) {
				mockData.items = mockData.items.slice(0, limit)
				mockData.count = mockData.items.length
			}
			
			setState({ data: mockData, loading: false, error: null })
		} catch (e) {
			if (controller.signal.aborted) return
			const message = e instanceof Error ? e.message : 'Failed to load'
			setState((s) => ({ ...s, loading: false, error: message }))
		}
	}, [limit, days])

	useEffect(() => {
		void load()
		return () => abortRef.current?.abort()
	}, [load])

	return { ...state, refresh: load }
}


