// src/services/api.js
import axios from "axios";

// Simple API URL detection - no ngrok complexity!
// If accessing from phone via IP (e.g., 192.168.1.3:5173), use same IP for backend
// If accessing from localhost, use localhost for backend
const getApiUrl = () => {
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
  timeout: 10000, // 10 seconds timeout
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
