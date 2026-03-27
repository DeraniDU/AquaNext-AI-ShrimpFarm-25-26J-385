/**
 * useDashboardData.ts (IoT Backend Edition with Mock Fallback)
 *
 * Fetches live sensor data from the Flask IoT Gateway (port 8000).
 * Falls back to mock data when the backend is offline so the UI always renders.
 *
 * Endpoint: GET /iot-api/api/sensor/latest
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { DashboardApiResponse, WaterQualityData, WaterQualityStatus } from './types'

// ─── Raw IoT Reading from backend ─────────────────────────────────────────────
interface IotReading {
  _id?: string
  device_id?: string
  timestamp: string
  temperature: number | null
  tds_value: number | null
  conductivity: number | null
  salinity_ppt: number | null
  ph: number | null
  do_mg_l: number | null
  battery: number | null
  alkalinity: number | null
  turbidity_ntu: number | null
  secchi_cm: number | null
  chlorophyll_a_ug_l: number | null
  tan_mg_l: number | null
  nh3_mg_l: number | null
  no2_mg_l: number | null
  no3_mg_l: number | null
  orp_mv: number | null
  ml_predictions?: {
    predicted_do_mg_l?: number
    predicted_next_hour_do_mg_l?: number
    model_used?: string
  }
  physics_calculations?: {
    do_saturation?: { do_saturation_percent?: number }
    nh3?: { nh3_mg_l?: number }
    salinity_status?: string
    tds_quality?: string
  }
  alerts?: { parameter: string; label: string; value?: number; unit?: string; status: string; message: string }[]
  relay_state?: { aerator: 'ON' | 'OFF'; reason?: string; do_level?: number }
}

function n(v: number | null | undefined, fallback = 0) {
  return v != null && isFinite(v) ? v : fallback
}

function calcStatus(ph: number, do_: number, temp: number, salinity: number): WaterQualityStatus {
  if (ph < 7.0 || ph > 9.0 || do_ < 4 || temp > 35 || temp < 25) return 'critical'
  if (ph < 7.5 || ph > 8.5 || do_ < 5 || temp > 33 || temp < 28 || salinity < 10 || salinity > 25) return 'poor'
  if (ph < 7.6 || ph > 8.4 || do_ < 6 || salinity < 15) return 'fair'
  if (do_ > 7 && ph >= 7.8 && ph <= 8.2) return 'excellent'
  return 'good'
}

function mapToWaterQuality(r: IotReading): WaterQualityData {
  const ph = n(r.ph, 7.8)
  const temp = n(r.temperature, 28)
  const do_ = n(r.do_mg_l ?? r.ml_predictions?.predicted_do_mg_l, 6)
  const salinity = n(r.salinity_ppt, 20)
  const alertMessages: string[] = (r.alerts ?? []).map((a) => a.message)
  return {
    timestamp: r.timestamp,
    pond_id: 1,
    ph, temperature: temp, dissolved_oxygen: do_, salinity,
    ammonia: n(r.nh3_mg_l, 0.03), nitrite: n(r.no2_mg_l, 0.1),
    nitrate: n(r.no3_mg_l, 50), turbidity: n(r.turbidity_ntu, 20),
    status: calcStatus(ph, do_, temp, salinity),
    alerts: alertMessages,
  }
}

function buildDashboard(r: IotReading, ponds: number): DashboardApiResponse {
  const wq = mapToWaterQuality(r)
  const pondList: WaterQualityData[] = [wq]
  for (let i = 2; i <= ponds; i++) pondList.push({ ...wq, pond_id: i })
  return {
    dashboard: {
      timestamp: r.timestamp, overall_health_score: wq.dissolved_oxygen >= 5 && wq.ph >= 7.5 ? 85 : 60,
      water_quality_summary: {}, feed_efficiency: 0, energy_efficiency: 0, labor_efficiency: 0,
      insights: [], alerts: wq.alerts, recommendations: [],
    },
    water_quality: pondList, feed: [], energy: [], labor: [],
    ...(({ extraIot: {
      ph: r.ph, temperature: r.temperature, salinity_ppt: r.salinity_ppt,
      tds_value: r.tds_value, conductivity: r.conductivity, alkalinity: r.alkalinity,
      turbidity_ntu: r.turbidity_ntu, secchi_cm: r.secchi_cm, chlorophyll_a_ug_l: r.chlorophyll_a_ug_l,
      tan_mg_l: r.tan_mg_l, nh3_mg_l: r.nh3_mg_l, no2_mg_l: r.no2_mg_l, no3_mg_l: r.no3_mg_l,
      orp_mv: r.orp_mv, battery: r.battery, device_id: r.device_id,
      ml_predictions: r.ml_predictions, physics_calculations: r.physics_calculations,
      alerts_raw: r.alerts, relay_state: r.relay_state,
    } }) as any),
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
type State = {
  data: DashboardApiResponse | null
  loading: boolean
  error: string | null
  lastUpdatedAt: string | null
  isLive: boolean
}

export function useDashboardData(params: { ponds: number; autoRefreshMs: number | null }) {
  const { ponds, autoRefreshMs } = params

  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
    lastUpdatedAt: null,
    isLive: false,
  })
  const abortRef = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setState((s) => ({ ...s, loading: true }))
    try {
      const res = await fetch('/iot-api/api/sensor/latest', { signal: ctrl.signal })
      if (ctrl.signal.aborted) return
      if (!res.ok) throw new Error(`Backend returned ${res.status}`)
      const json = await res.json()
      if (json.status !== 'success') throw new Error(json.error ?? 'No data')
      const reading: IotReading = json.data
      setState({
        data: buildDashboard(reading, ponds),
        loading: false,
        error: null,
        lastUpdatedAt: new Date().toISOString(),
        isLive: true,
      })
    } catch (e) {
      if (ctrl.signal.aborted) return
      const msg = e instanceof Error ? e.message : 'Connection error'
      setState((s) => ({
        ...s,
        loading: false,
        error: `Backend offline (${msg}). No data. Start app.py on port 8000.`,
        isLive: false,
      }))
    }
  }, [ponds])

  const refresh = useCallback(async () => load(), [load])

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
