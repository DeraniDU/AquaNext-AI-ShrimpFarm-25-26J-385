import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

// ─── Types ────────────────────────────────────────────────────────────────────
interface RawAlert {
  parameter: string
  label: string
  value?: number
  unit?: string
  status: string
  message: string
}

interface MlPredictions {
  predicted_do_mg_l?: number
  predicted_next_hour_do_mg_l?: number
  model_used?: string
  do_from_temp_current?: number
  do_from_temp_1h?: number
  temp_1h_forecast_c?: number
  temp_do_risk?: string
  aerator_recommended?: boolean
}

interface RelayState {
  aerator: 'ON' | 'OFF'
  reason?: string
  do_level?: number
  trigger_source?: string
  temp_prediction?: {
    current_do_sat_mg_l: number
    predicted_do_sat_1h: number
    temp_used_c: number
    temp_1h_forecast_c: number
    risk_level: string
    aerator_recommended: boolean
  }
}

interface PhysicsData {
  do_saturation?: { do_saturation_percent?: number }
  nh3?: { nh3_mg_l?: number }
  salinity_status?: string
  tds_quality?: string
}

export interface ExtraIotFields {
  device_id?: string
  ph?: number | null
  temperature?: number | null
  salinity_ppt?: number | null
  tds_value?: number | null
  conductivity?: number | null
  alkalinity?: number | null
  turbidity_ntu?: number | null
  secchi_cm?: number | null
  chlorophyll_a_ug_l?: number | null
  tan_mg_l?: number | null
  nh3_mg_l?: number | null
  no2_mg_l?: number | null
  no3_mg_l?: number | null
  orp_mv?: number | null
  battery?: number | null
  ml_predictions?: MlPredictions
  physics_calculations?: PhysicsData
  alerts_raw?: RawAlert[]
  relay_state?: RelayState
}

interface HistoryPoint { time: string; temp: number | null; doActual: number | null; doFromTemp: number | null; doPredicted: number | null }

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function fmt(v: number | null | undefined, decimals = 1): string {
  return v == null ? '—' : v.toFixed(decimals)
}

export function Row({ label, value, unit = '', badge }: { label: string; value: string; unit?: string; badge?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{label}</span>
      <span className="mono" style={{ fontSize: '0.82rem' }}>
        {value} <span className="muted" style={{ fontSize: '0.75rem' }}>{unit}</span>
        {badge && <span style={{ marginLeft: 6 }}>{badge}</span>}
      </span>
    </div>
  )
}

export function alertBorderColor(s: string) { return s.includes('critical') ? '#ef4444' : s.includes('warning') ? '#f59e0b' : '#3b82f6' }
export function alertBg(s: string) { return s.includes('critical') ? 'rgba(239,68,68,0.07)' : s.includes('warning') ? 'rgba(245,158,11,0.07)' : 'rgba(59,130,246,0.07)' }

// ─── Main Sensor Cards ─────────────────────────────────────────────────────────

function SensorCard({ title, value, unit, status, min, max }: { title: string, value: string, unit: string, status: 'good'|'warn'|'bad', min?: number, max?: number }) {
  let color = '#22c55e'
  let bg = 'rgba(34, 197, 94, 0.05)'
  if (status === 'warn') { color = '#f59e0b'; bg = 'rgba(245, 158, 11, 0.05)' }
  if (status === 'bad') { color = '#ef4444'; bg = 'rgba(239, 68, 68, 0.05)' }

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px 20px',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
      borderTop: `4px solid ${color}`,
      display: 'flex', flexDirection: 'column', gap: 8
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
        <span style={{ background: bg, color: color, padding: '2px 8px', borderRadius: 12, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>
          {status === 'good' ? 'Optimal' : status === 'warn' ? 'Warning' : 'Critical'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="mono" style={{ fontSize: '2.4rem', fontWeight: 700, color: '#1f2937', lineHeight: 1 }}>{value}</span>
        <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{unit}</span>
      </div>
      {min !== undefined && max !== undefined && (
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Target: {min} - {max} {unit}</div>
      )}
    </div>
  )
}

// ─── DO + Temperature Chart ───────────────────────────────────────────────────
function DoTempChart({ history }: { history: HistoryPoint[] }) {
  if (history.length < 2) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
      Collecting time-series data... (need ≥2 data points)
    </div>
  )

  const labels = history.map(h => h.time)
  const data = {
    labels,
    datasets: [
      {
        label: 'DO — Temp Physics (mg/L)',
        data: history.map(h => h.doFromTemp),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 2,
        fill: true,
        yAxisID: 'yDo',
      },
      {
        label: 'DO — RF Predicted (mg/L)',
        data: history.map(h => h.doPredicted),
        borderColor: '#a855f7',
        backgroundColor: 'transparent',
        borderDash: [5, 4],
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
        yAxisID: 'yDo',
      },
      {
        label: 'Temperature (°C)',
        data: history.map(h => h.temp),
        borderColor: '#ef4444',
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 2,
        yAxisID: 'yTemp',
      },
      {
        label: 'Aerator DO Threshold',
        data: history.map(() => 4.0),
        borderColor: 'rgba(239,68,68,0.5)',
        borderWidth: 1,
        borderDash: [2, 2],
        pointRadius: 0,
        yAxisID: 'yDo',
      }
    ],
  }

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: true, position: 'bottom', labels: { color: 'inherit', boxWidth: 12, font: { size: 11 } } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { ticks: { color: 'inherit', maxTicksLimit: 8, font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
      yDo: {
        type: 'linear', position: 'left',
        title: { display: true, text: 'Dissolved Oxygen (mg/L)', color: '#3b82f6', font: { weight: 600 } },
        ticks: { color: '#3b82f6', font: { size: 10 } },
        grid: { color: 'rgba(0,0,0,0.04)' },
        afterDataLimits: (axis: any) => { axis.min = Math.min(axis.min, 2); axis.max = Math.max(axis.max, 10) },
      },
      yTemp: {
        type: 'linear', position: 'right',
        title: { display: true, text: 'Temperature (°C)', color: '#ef4444', font: { weight: 600 } },
        ticks: { color: '#ef4444', font: { size: 10 } },
        grid: { display: false },
        afterDataLimits: (axis: any) => { axis.min = Math.min(axis.min, 15); axis.max = Math.max(axis.max, 40) },
      },
    },
  }

  return <Line data={data as any} options={options} />
}

// ─── Main Component ───────────────────────────────────────────────────────────
const MAX_HISTORY = 50

export function IoTLivePanel({ extraIot, error }: { extraIot: ExtraIotFields; error: string | null }) {
  const relay = extraIot.relay_state
  const ml = extraIot.ml_predictions
  const aeratorOn = relay?.aerator === 'ON'

  // Build rolling history for the chart
  const historyRef = useRef<HistoryPoint[]>([])
  const [chartHistory, setChartHistory] = useState<HistoryPoint[]>([])
  const lastTsRef = useRef<string>('')

  useEffect(() => {
    // Deduplicate by timestamp
    const nowKey = `${extraIot.temperature ?? ''}-${Date.now()}`
    if (nowKey === lastTsRef.current) return
    lastTsRef.current = nowKey

    if (extraIot.temperature == null && !ml?.do_from_temp_current) return

    const point: HistoryPoint = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      temp: extraIot.temperature ?? null,
      doActual: null,
      doFromTemp: ml?.do_from_temp_current ?? null,
      doPredicted: ml?.predicted_do_mg_l ?? null,
    }

    const next = [...historyRef.current, point].slice(-MAX_HISTORY)
    historyRef.current = next
    setChartHistory([...next])
  }, [ml?.do_from_temp_current, extraIot.temperature])

  // Status calculations for main cards
  const phStatus = extraIot.ph == null ? 'good' : (extraIot.ph < 7.0 || extraIot.ph > 9.0) ? 'bad' : (extraIot.ph < 7.5 || extraIot.ph > 8.5) ? 'warn' : 'good'
  const tempStatus = extraIot.temperature == null ? 'good' : (extraIot.temperature < 29 || extraIot.temperature > 32) ? 'bad' : 'good'
  const salStatus = extraIot.salinity_ppt == null ? 'good' : (extraIot.salinity_ppt < 10 || extraIot.salinity_ppt > 25) ? 'warn' : 'good'
  const tdsStatus = extraIot.tds_value == null ? 'good' : (extraIot.tds_value > 35000) ? 'warn' : 'good'

  return (
    <div style={{ marginBottom: 40, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Offline / Error Banner */}
      {error && (
        <div style={{ borderRadius: 8, borderLeft: '4px solid #ef4444', background: '#fef2f2', marginBottom: 20, padding: '12px 16px', color: '#991b1b', fontSize: '0.9rem', fontWeight: 500 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Prominent Aerator Relay Banner */}
      <div style={{
        borderRadius: 12,
        border: `2px solid ${aeratorOn ? '#ef4444' : '#22c55e'}`,
        background: aeratorOn ? '#fef2f2' : '#f0fdf4',
        marginBottom: 24, padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            background: aeratorOn ? '#ef4444' : '#22c55e',
            boxShadow: `0 0 12px ${aeratorOn ? '#ef4444' : '#22c55e'}`
          }} />
          <span style={{ fontWeight: 800, fontSize: '1.2rem', color: aeratorOn ? '#b91c1c' : '#166534', letterSpacing: '0.05em' }}>
            AERATOR MOTOR: {aeratorOn ? 'ON (RUNNING)' : 'OFF (STANDBY)'}
          </span>
          {relay?.trigger_source && (
            <span style={{ background: '#1e40af', color: 'white', padding: '4px 10px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
              {relay.trigger_source.replace('_', ' ')}
            </span>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          {relay?.reason ? <div style={{ fontWeight: 600, color: aeratorOn ? '#991b1b' : '#166534' }}>{relay.reason}</div> : <div style={{ fontWeight: 600, color: '#166534' }}>System OK</div>}
          <div className="muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
            {relay?.do_level != null ? `DO Level at Trigger: ${relay.do_level} mg/L` : ''}
            {extraIot.device_id ? ` | Sensor Node: ${extraIot.device_id.toUpperCase()}` : ''}
          </div>
        </div>
      </div>

      {/* ── 4 Main Real-Time Parameters ── */}
      <h2 style={{ fontSize: '1.2rem', color: '#1f2937', marginBottom: 16, borderBottom: '2px solid #e5e7eb', paddingBottom: 8 }}>
        Real-Time Core Parameters
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <SensorCard title="Temperature" value={fmt(extraIot.temperature, 1)} unit="°C" status={tempStatus} min={29} max={32} />
        <SensorCard title="pH Level" value={fmt(extraIot.ph, 2)} unit="" status={phStatus} min={7.5} max={8.5} />
        <SensorCard title="Salinity" value={fmt(extraIot.salinity_ppt, 1)} unit="ppt" status={salStatus} min={10} max={25} />
        <SensorCard title="TDS" value={fmt(extraIot.tds_value, 0)} unit="ppm" status={tdsStatus} max={35000} />
      </div>

      {/* ── Time-Series Prediction Chart ── */}
      <h2 style={{ fontSize: '1.2rem', color: '#1f2937', marginBottom: 16, borderBottom: '2px solid #e5e7eb', paddingBottom: 8 }}>
        Dissolved Oxygen (DO) Prediction
      </h2>
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: 4 }}>
              Predicting DO dropping based on <strong>Temperature rise</strong> (Henry's Law) and <strong>RF Machine Learning</strong>.
            </div>
            {(aeratorOn && relay?.trigger_source?.includes('temp')) ? (
              <div style={{ color: '#ef4444', fontWeight: 600, marginTop: 8 }}>
                ⚠️ High Temperature detected. Aerator forced ON to prevent DO drop.
              </div>
            ) : (
              <div style={{ color: '#059669', fontWeight: 600, marginTop: 8 }}>
                ✅ Temperatures acceptable. DO levels expected to remain stable.
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Physics Saturation</div>
              <div className="mono" style={{ fontSize: '1.2rem', color: '#3b82f6', fontWeight: 700 }}>{fmt(ml?.do_from_temp_current, 2)}</div>
            </div>
            <div style={{ width: 1, background: '#cbd5e1' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>ML Prediction</div>
              <div className="mono" style={{ fontSize: '1.2rem', color: '#a855f7', fontWeight: 700 }}>{fmt(ml?.predicted_do_mg_l, 2)}</div>
            </div>
          </div>
        </div>

        <div style={{ height: 320, position: 'relative' }}>
          <DoTempChart history={chartHistory} />
        </div>
      </div>
    </div>
  )
}
