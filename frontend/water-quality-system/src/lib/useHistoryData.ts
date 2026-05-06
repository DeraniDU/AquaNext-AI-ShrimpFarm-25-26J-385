/**
 * useHistoryData.ts (IoT Backend Edition)
 *
 * Fetches the last N sensor readings from the Flask IoT Gateway and
 * reshapes them into SavedFarmSnapshot[] so the WaterQualityView's
 * trend chart works as expected.
 *
 * Endpoint: GET /iot-api/api/sensor/readings?limit=<N>
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { HistoryApiResponse, SavedFarmSnapshot, WaterQualityStatus } from './types'

interface IotReading {
  timestamp: string
  ph: number | null
  temperature: number | null
  do_mg_l: number | null
  salinity_ppt: number | null
  nh3_mg_l: number | null
  no2_mg_l: number | null
  no3_mg_l: number | null
  turbidity_ntu: number | null
  ml_predictions?: { predicted_do_mg_l?: number }
}

function n(v: number | null | undefined, fallback = 0) {
  return v != null && isFinite(v) ? v : fallback
}

function calcStatus(ph: number, do_: number): WaterQualityStatus {
  if (do_ < 4 || ph < 7.0 || ph > 9.0) return 'critical'
  if (do_ < 5 || ph < 7.5 || ph > 8.5) return 'poor'
  if (do_ < 6) return 'fair'
  if (do_ > 7 && ph >= 7.8 && ph <= 8.2) return 'excellent'
  return 'good'
}

function iotToSnapshot(r: IotReading): SavedFarmSnapshot {
  const ph = n(r.ph, 7.8)
  const temp = n(r.temperature, 28)
  const do_ = n(r.do_mg_l ?? r.ml_predictions?.predicted_do_mg_l, 6)
  const salinity = n(r.salinity_ppt, 20)

  return {
    source: 'iot',
    timestamp: r.timestamp,
    water_quality: [
      {
        pond_id: 1,
        ph,
        temperature: temp,
        dissolved_oxygen: do_,
        salinity,
        status: calcStatus(ph, do_),
        alerts: [],
      },
    ],
    feed: [],
    energy: [],
    labor: [],
  }
}

type State = {
  data: HistoryApiResponse | null
  loading: boolean
  error: string | null
}

export function useHistoryData(params: { limit?: number; days?: number }) {
  const { limit, days } = params
  // Convert days to number of readings (approx 1 reading per 5 minutes for a week = ~2016)
  const effectiveLimit = limit ?? (days != null ? days * 288 : 200)

  const [state, setState] = useState<State>({ data: null, loading: true, error: null })
  const abortRef = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      const res = await fetch(`/iot-api/api/sensor/readings?limit=${effectiveLimit}`, { signal: ctrl.signal })
      if (ctrl.signal.aborted) return

      if (!res.ok) throw new Error(`Backend returned ${res.status}`)
      const json = await res.json()

      if (json.status !== 'success') throw new Error(json.error ?? 'No data')

      const readings: IotReading[] = json.data
      // Backend returns newest-first; reverse so we go oldest→newest for charts
      const snapshots: SavedFarmSnapshot[] = [...readings].reverse().map(iotToSnapshot)

      setState({
        data: { count: snapshots.length, items: snapshots },
        loading: false,
        error: null,
      })
    } catch (e) {
      if (ctrl.signal.aborted) return
      const msg = e instanceof Error ? e.message : 'Connection error'
      setState((s) => ({ ...s, loading: false, error: msg }))
    }
  }, [effectiveLimit])

  useEffect(() => {
    void load()
    return () => abortRef.current?.abort()
  }, [load])

  return { ...state, refresh: load }
}
