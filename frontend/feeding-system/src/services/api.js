// src/services/api.js
import axios from "axios";

// Simple API URL detection - no ngrok complexity!
// Use VITE_API_BASE_URL if set (e.g. when using api-gateway: http://127.0.0.1:8000/api/feeding-system)
// When running on port 5174 (feeding-system dev server), default to gateway path so /batch goes via gateway → 8002
// Otherwise: if accessing from phone via IP use same IP:8000; from localhost use 127.0.0.1:8000
const getApiUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (base && typeof base === "string" && base.trim()) {
    return base.trim().replace(/\/$/, ""); // no trailing slash
  }
  const port = window.location.port;
  const hostname = window.location.hostname;
  const protocol = window.location.protocol; // 'http:' or 'https:'

  // If accessing via IP address (mobile/network), use same IP for backend
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `${protocol}//${hostname}:8000/api/feeding-system`;
  }

  // Default to localhost for development
  return "http://127.0.0.1:8000/api/feeding-system";
};

// Create axios instance
const API = axios.create({
  baseURL: getApiUrl(), // Auto-detects correct backend URL
  timeout: 20000, // 20 seconds (gateway + backend can be slow)
  headers: {
    "Content-Type": "application/json",
  },
});

// Log API URL for debugging
console.log("🌐 API Base URL:", getApiUrl());

// Optional: Response interceptor for errors
API.interceptors.response.use(
  (response) => {
    // For blob responses (file downloads), return as-is
    if (response.config.responseType === 'blob') {
      return response;
    }
    return response; // return response if successful
  },
  (error) => {
    console.error("API Error:", error.response || error.message);
    return Promise.reject(error);
  }
);

export default API;
