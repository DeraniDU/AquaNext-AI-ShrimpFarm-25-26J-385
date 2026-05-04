"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type BehaviorLog = {
  timestamp: string;
  stress_score: number;
  stress_level: string;
  features?: {
    clustering_score?: number;
    active_area_ratio?: number;
  };
};

type LatestResponse = {
  success: boolean;
  data: BehaviorLog;
};

type HistoryResponse = {
  success: boolean;
  data: BehaviorLog[];
};

const API_BASE = "http://localhost:5000/api/behavior-monitoring";

export default function BehaviorMonitoringChart() {
  const [latest, setLatest] = useState<BehaviorLog | null>(null);
  const [history, setHistory] = useState<BehaviorLog[]>([]);
  const [loading, setLoading] = useState(true);

  const pondId = "P01";

  const fetchData = async () => {
    try {
      const [latestRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/latest/${pondId}`),
        fetch(`${API_BASE}/history/${pondId}?minutes=30`),
      ]);

      const latestJson: LatestResponse = await latestRes.json();
      const historyJson: HistoryResponse = await historyRes.json();

      if (latestJson.success) setLatest(latestJson.data);
      if (historyJson.success) setHistory(historyJson.data);
    } catch (error) {
      console.error("Error fetching behavior monitoring data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const chartData = history.map((item) => ({
    time: new Date(item.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    stress_score: item.stress_score,
    stress_level: item.stress_level,
    clustering_score: item.features?.clustering_score ?? null,
    active_area_ratio: item.features?.active_area_ratio ?? null,
  }));

  const getStatusColor = (level?: string) => {
    if (!level) return "var(--text-muted)";
    const value = level.toUpperCase();
    if (value.includes("HIGH")) return "var(--error-color)";
    if (value.includes("MEDIUM")) return "var(--warning-color)";
    return "var(--success-color)";
  };

  if (loading) {
    return <div className="loading-container">
      <div className="custom-loader"></div>
      <p>Loading behavior monitoring data...</p>
    </div>;
  }

  return (
    <div className="chart-container glass-panel">
      <h2 className="chart-title">AquaNext Behavior Monitoring</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Current Stress Level</p>
          <p
            className="stat-value"
            style={{ color: getStatusColor(latest?.stress_level) }}
          >
            {latest?.stress_level ?? "N/A"}
          </p>
          <div className="stat-glow" style={{ backgroundColor: getStatusColor(latest?.stress_level) }}></div>
        </div>

        <div className="stat-card">
          <p className="stat-label">Current Stress Score</p>
          <p className="stat-value">
            {latest?.stress_score?.toFixed(4) ?? "N/A"}
          </p>
        </div>

        <div className="stat-card">
          <p className="stat-label">Last Updated</p>
          <p className="stat-sub">
            {latest?.timestamp
              ? new Date(latest.timestamp).toLocaleString()
              : "N/A"}
          </p>
        </div>
      </div>

      <div className="line-chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis dataKey="time" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)', fontSize: 12}} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)', fontSize: 12}} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-color)', backdropFilter: 'blur(10px)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-lg)' }}
              itemStyle={{ color: 'var(--accent-color)' }}
            />
            <Line
              type="monotone"
              dataKey="stress_score"
              name="Stress Score"
              stroke="url(#colorStress)"
              strokeWidth={4}
              dot={{ r: 4, fill: "var(--bg-primary)", stroke: "var(--accent-color)", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "var(--accent-color)", stroke: "var(--bg-primary)", strokeWidth: 2 }}
            />
            <defs>
              <linearGradient id="colorStress" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}