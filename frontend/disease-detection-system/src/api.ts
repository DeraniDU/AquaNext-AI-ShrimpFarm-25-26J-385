import axios from 'axios'

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8001'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types
export interface RiskPredictionInput {
  activity_mean: number
  activity_std: number
  drop_ratio_min: number
  abnormal_rate: number
  feed_amount: number
  feed_response: number
  DO: number
  temp: number
  pH: number
  salinity: number
  pond_id?: string
  timestamp?: string
}

export interface Prediction {
  pond_id?: string
  timestamp?: string
  saved_to_db: boolean
  record_id?: string
  [key: string]: unknown
}

export interface BehaviorInput {
  pond_id: string
  timestamp: string
  activity_index: number
  activity_std?: number
  drop_ratio?: number
  abnormal?: number
}

export interface BehaviorResponse {
  ok: boolean
  message: string
  pond_id: string
  stored_points: number
  record_id?: string
}

export interface HealthResponse {
  ok: boolean
  service: string
  env: string
}

export interface PondStatus {
  ok: boolean
  pond_id: string
  latest_behavior: unknown
  latest_feeding: unknown
  latest_environment: unknown
  latest_prediction: unknown
  recent_behavior_points: unknown[]
}

// Health Check
export const checkHealth = async (): Promise<HealthResponse> => {
  const response = await api.get<HealthResponse>('/health')
  return response.data
}

// Risk Prediction
export const predictRisk = async (input: RiskPredictionInput): Promise<Prediction> => {
  const response = await api.post<Prediction>('/predict-risk', input)
  return response.data
}

export const getPredictions = async (limit: number = 50): Promise<Prediction[]> => {
  const response = await api.get<{ ok: boolean; data: Prediction[] }>('/predictions', {
    params: { limit },
  })
  return response.data.data
}

export const getPredictionsByPond = async (
  pondId: string,
  limit: number = 50
): Promise<Prediction[]> => {
  const response = await api.get<{ ok: boolean; pond_id: string; data: Prediction[] }>(
    `/predictions/${pondId}`,
    {
      params: { limit },
    }
  )
  return response.data.data
}

// Behavior Data
export const pushBehaviorData = async (input: BehaviorInput): Promise<BehaviorResponse> => {
  const response = await api.post<BehaviorResponse>('/behavior/live', input)
  return response.data
}

export const getBehaviorByPond = async (
  pondId: string
): Promise<{ ok: boolean; pond_id: string; points: unknown[] }> => {
  const response = await api.get(`/behavior/${pondId}`)
  return response.data
}

export const getAllBehavior = async (): Promise<{
  ok: boolean
  ponds: { [key: string]: unknown[] }
}> => {
  const response = await api.get('/behavior')
  return response.data
}

// Risk Recalculation
export const recalculateRisk = async (pondId: string): Promise<{ ok: boolean; [key: string]: unknown }> => {
  const response = await api.post(`/recalculate-risk/${pondId}`)
  return response.data
}

// Pond Status
export const getPondStatus = async (pondId: string): Promise<PondStatus> => {
  const response = await api.get<PondStatus>(`/pond-status/${pondId}`)
  return response.data
}

export default api
