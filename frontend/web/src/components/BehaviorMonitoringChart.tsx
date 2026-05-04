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
    if (!level) return "#6b7280";
    const value = level.toUpperCase();
    if (value.includes("HIGH")) return "#ef4444";
    if (value.includes("MEDIUM")) return "#f59e0b";
    return "#22c55e";
  };

  if (loading) {
    return <div>Loading behavior monitoring...</div>;
  }

  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-4">Behavior Monitoring</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border p-4">
          <p className="text-sm text-gray-500">Current Stress Level</p>
          <p
            className="text-2xl font-bold"
            style={{ color: getStatusColor(latest?.stress_level) }}
          >
            {latest?.stress_level ?? "N/A"}
          </p>
        </div>

        <div className="rounded-xl border p-4">
          <p className="text-sm text-gray-500">Current Stress Score</p>
          <p className="text-2xl font-bold">
            {latest?.stress_score?.toFixed(4) ?? "N/A"}
          </p>
        </div>

        <div className="rounded-xl border p-4">
          <p className="text-sm text-gray-500">Last Updated</p>
          <p className="text-base font-medium">
            {latest?.timestamp
              ? new Date(latest.timestamp).toLocaleString()
              : "N/A"}
          </p>
        </div>
      </div>

      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="stress_score"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}