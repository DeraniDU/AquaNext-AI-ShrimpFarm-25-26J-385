import axios from 'axios';

// Prefer VITE_API_BASE_URL; in dev use '/api' so Vite proxy hits backend (avoids CORS).
// vite.config.js proxies /api -> http://localhost:8001
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : 'http://localhost:8001');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health check
export const healthCheck = () => apiClient.get('/health');

// Risk Predictions
export const predictRisk = (data) => 
  apiClient.post('/predict-risk', data);

export const getAllPredictions = (limit = 50) => 
  apiClient.get(`/predictions?limit=${limit}`);

export const getPredictionsByPond = (pondId, limit = 50) => 
  apiClient.get(`/predictions/${pondId}?limit=${limit}`);

// Behavior Endpoints
export const pushBehavior = (behaviorData) => 
  apiClient.post('/behavior/live', behaviorData);

export const getBehaviorByPond = (pondId) => 
  apiClient.get(`/behavior/${pondId}`);

export const getAllBehavior = () => 
  apiClient.get('/behavior');

// Feeding Endpoints
export const pushFeeding = (feedingData) => 
  apiClient.post('/feeding/live', feedingData);

// Recalculate Risk
export const recalculateRisk = (pondId) => 
  apiClient.post(`/recalculate-risk/${pondId}`);

// Pond Status
export const getPondStatus = (pondId) => 
  apiClient.get(`/pond-status/${pondId}`);

export default apiClient;
