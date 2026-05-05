import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const API_BASE = "http://localhost:5000/api/disease-risk";

function riskToNumber(level) {
  if (level === "HIGH") return 0.9;
  if (level === "MEDIUM") return 0.6;
  return 0.2;
}

export default function DiseaseRiskChart() {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);

  async function fetchRiskData() {
    try {
      const latestRes = await fetch(`${API_BASE}/latest/P01`);
      const historyRes = await fetch(`${API_BASE}/history/P01`);

      const latestJson = await latestRes.json();
      const historyJson = await historyRes.json();

      setLatest(latestJson.data);

      const chartData = (historyJson.data || [])
        .slice()
        .reverse()
        .map((item) => ({
          time: new Date(item.timestamp).toLocaleTimeString(),
          riskValue: riskToNumber(item.risk_level),
          risk_level: item.risk_level,
          water_quality_score: item.water_quality_score,
          movement_score: item.movement_score,
          feeding_score: item.feeding_score,
        }));

      setHistory(chartData);
    } catch (err) {
      console.error("Failed to fetch disease risk data:", err);
    }
  }

  useEffect(() => {
    fetchRiskData();
    const interval = setInterval(fetchRiskData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="risk-card">
      <h2>Final Disease Risk Prediction</h2>

      <div className="risk-summary">
        <div>
          <p>Current Risk Level</p>
          <h1 className={`risk-${latest?.risk_level?.toLowerCase()}`}>
            {latest?.risk_level || "N/A"}
          </h1>
        </div>

        <div>
          <p>Water Score</p>
          <h3>{latest?.water_quality_score ?? "N/A"}</h3>
        </div>

        <div>
          <p>Movement Score</p>
          <h3>{latest?.movement_score ?? "N/A"}</h3>
        </div>

        <div>
          <p>Feeding Score</p>
          <h3>{latest?.feeding_score ?? "N/A"}</h3>
        </div>
      </div>

      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[0, 1]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="riskValue"
              stroke="#ef4444"
              strokeWidth={3}
              dot={true}
            />
            <Line
              type="monotone"
              dataKey="water_quality_score"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="movement_score"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="feeding_score"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
