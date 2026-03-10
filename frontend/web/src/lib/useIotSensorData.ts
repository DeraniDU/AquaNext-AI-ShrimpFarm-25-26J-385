import { useCallback, useEffect, useRef, useState } from 'react'
import type { WaterQualityData } from './types'

export type SensorReading = WaterQualityData & {
    device_id: string
    tds_value: number
    conductivity: number
    battery: number
    secchi_cm: number
    alkalinity: number
    turbidity_ntu: number
    chlorophyll_a_ug_l: number
    tan_mg_l: number
    nh3_mg_l: number
    no2_mg_l: number
    no3_mg_l: number
    orp_mv: number
    do_mg_l: number
}

export type IotSensorApiResponse = {
    status: string
    total_count: number
    returned_count: number
    data: SensorReading[]
}

export type IotSensorLatestResponse = {
    status: string
    data: SensorReading
}

type State = {
    data: SensorReading[]
    latest: SensorReading | null
    loading: boolean
    error: string | null
}

export function useIotSensorData(params: { deviceId?: string; autoRefreshMs: number | null; limit?: number }) {
    const { deviceId, autoRefreshMs, limit = 100 } = params
    const [state, setState] = useState<State>({ data: [], latest: null, loading: false, error: null })
    const abortRef = useRef<AbortController | null>(null)

    const baseUrl = `/api/sensor/readings?limit=${limit}${deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : ''}`
    const latestUrl = `/api/sensor/latest${deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : ''}`

    const load = useCallback(async () => {
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        setState((s) => ({ ...s, loading: true, error: null }))
        try {
            // Fetch both latest and history in parallel
            const [historyRes, latestRes] = await Promise.all([
                fetch(baseUrl, { signal: controller.signal, cache: 'no-store' }),
                fetch(latestUrl, { signal: controller.signal, cache: 'no-store' })
            ])

            if (!historyRes.ok) throw new Error(`History API ${historyRes.status}`)
            
            const historyJson = (await historyRes.json()) as IotSensorApiResponse
            let latestJson: IotSensorLatestResponse | null = null
            
            if (latestRes.ok) {
                 latestJson = (await latestRes.json()) as IotSensorLatestResponse
            }

            setState({ 
                data: historyJson.data || [], 
                latest: latestJson?.data || null, 
                loading: false, 
                error: null 
            })
        } catch (e) {
            if (controller.signal.aborted) return
            const message = e instanceof Error ? e.message : 'Failed to load IoT data'
            setState((s) => ({ ...s, loading: false, error: message }))
        }
    }, [baseUrl, latestUrl])

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
