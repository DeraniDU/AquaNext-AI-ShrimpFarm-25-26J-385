// src/pages/History.jsx
import { useState, useEffect } from "react";
import API from "../services/api";
import { useTranslation } from "../hooks/useTranslation";

export default function History() {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    fetchHistory();
  }, [limit]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await API.get(`/feeding-history?limit=${limit}`);
      setEvents(res.data?.events || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch (error) {
      return "N/A";
    }
  };

  const getMotorStatusLabel = (state) => {
    switch (state) {
      case "feeding_fast":
      case "high":
        return t("motor.feedingFast");
      case "feeding_slow":
      case "low":
        return t("motor.feedingSlow");
      case "stopped":
      case "no":
        return t("motor.stopped");
      default:
        return t("motor.stopped");
    }
  };

  const getMotorStatusColor = (state) => {
    switch (state) {
      case "stopped":
      case "no":
        return "bg-red-100 text-red-700 border-red-300"; // RED for stopped
      case "feeding_fast":
      case "high":
        return "bg-green-100 text-green-700 border-green-300"; // GREEN for high
      case "feeding_slow":
      case "low":
        return "bg-yellow-100 text-yellow-700 border-yellow-300"; // YELLOW for low
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">{t("common.loading")}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{t("history.title")}</h1>
          <p className="text-gray-600">{t("history.subtitle")}</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-semibold text-gray-700">
              {t("history.showLast")}
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value={25}>25 {t("history.events")}</option>
              <option value={50}>50 {t("history.events")}</option>
              <option value={100}>100 {t("history.events")}</option>
              <option value={200}>200 {t("history.events")}</option>
            </select>
          </div>
          <button
            onClick={fetchHistory}
            className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
          >
            🔄 {t("history.refresh")}
          </button>
        </div>

        {/* Events List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {events.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📊</span>
              </div>
              <p className="text-xl font-semibold text-gray-700 mb-2">{t("history.noRecords")}</p>
              <p className="text-gray-500">{t("history.eventsWillAppear")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${getMotorStatusColor(event.state || event.to_state || "unknown")}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">⚙️</span>
                        <div>
                          <p className="font-bold text-lg">
                            {getMotorStatusLabel(event.state || event.to_state || "unknown")}
                          </p>
                          <p className="text-sm opacity-75">
                            Motor Speed: {((event.motor_speed || 0) * 100).toFixed(0)}%
                            {event.confidence && ` • Confidence: ${(event.confidence * 100).toFixed(1)}%`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatDate(event.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



