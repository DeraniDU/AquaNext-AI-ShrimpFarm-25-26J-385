// src/pages/Motor.jsx
import { useState, useEffect } from "react";
import API from "../services/api";
import { useTranslation } from "../hooks/useTranslation";

export default function Motor() {
  const { t } = useTranslation();
  const [motorStatus, setMotorStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchMotorData();
    let interval = null;
    if (autoRefresh) {
      interval = setInterval(fetchMotorData, 5000); // Refresh every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchMotorData = async () => {
    try {
      const [statusRes, historyRes] = await Promise.all([
        API.get("/motor/status"),
        API.get("/feeding-history?limit=20")
      ]);
      setMotorStatus(statusRes.data?.data || null);
      setHistory(historyRes.data?.events || []);
    } catch (error) {
      console.error("Error fetching motor data:", error);
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

  const getMotorStatusColor = (state) => {
    switch (state) {
      case "stopped":
      case "no":
        return "bg-red-500"; // RED for stopped
      case "feeding_fast":
      case "high":
        return "bg-green-500"; // GREEN for high
      case "feeding_slow":
      case "low":
        return "bg-yellow-500"; // YELLOW for low
      default:
        return "bg-gray-500";
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
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{t("motor.title")}</h1>
          <p className="text-gray-600">{t("motor.subtitle")}</p>
        </div>

        {/* Motor Status Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{t("motor.currentStatus")}</h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-600">{t("motor.autoRefresh")}</span>
              </label>
              <button
                onClick={fetchMotorData}
                className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
              >
                 {t("motor.refreshNow")}
              </button>
            </div>
          </div>

          {motorStatus ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">{t("motor.motorState")}</p>
                <div className={`inline-block px-6 py-3 rounded-lg ${getMotorStatusColor(motorStatus.state)} text-white font-bold text-lg`}>
                  {getMotorStatusLabel(motorStatus.state)}
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">{t("motor.motorSpeed")}</p>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="transform -rotate-90 w-32 h-32">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - motorStatus.motor_speed)}`}
                      className="text-blue-600 transition-all"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-800">
                      {(motorStatus.motor_speed * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">{t("motor.lastUpdate")}</p>
                <p className="text-lg font-semibold text-gray-800">{formatDate(motorStatus.updated_at)}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚙️</span>
              </div>
              <p className="text-gray-600 font-semibold">{t("motor.noStatus")}</p>
              <p className="text-sm text-gray-500 mt-2">{t("motor.motorEventsWillAppear")}</p>
            </div>
          )}
        </div>

        {/* Motor History Timeline */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{t("motor.eventHistory")}</h2>
          
          {history.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">{t("motor.noEvents")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((event, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className={`w-3 h-3 rounded-full mt-2 ${getMotorStatusColor(event.state || event.to_state || "unknown")}`}></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {getMotorStatusLabel(event.state || event.to_state || "unknown")}
                        </p>
                        <p className="text-sm text-gray-600">
                          Speed: {((event.motor_speed || 0) * 100).toFixed(0)}% 
                          {event.confidence && ` • Confidence: ${(event.confidence * 100).toFixed(1)}%`}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(event.created_at)}</span>
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



