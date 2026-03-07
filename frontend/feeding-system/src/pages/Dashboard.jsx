// src/pages/Dashboard.jsx - Clean and Simple Dashboard
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useToast } from "../hooks/useToast.jsx";
import { useTranslation } from "../hooks/useTranslation";

export default function Dashboard() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const { t } = useTranslation();
  
  const [tanks, setTanks] = useState([]);
  const [motorStatus, setMotorStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFeedingTimes, setLastFeedingTimes] = useState({});

  useEffect(() => {
    fetchAllData();
    // Auto-refresh every 5 seconds to catch motor status changes quickly
    const interval = setInterval(fetchAllData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async (showNotification = false) => {
    try {
      setIsRefreshing(true);
      const timestamp = new Date().getTime();
      const batchesRes = await API.get(`/batch?t=${timestamp}`);
      
      // Handle response - API returns array directly
      let allTanks = [];
      if (Array.isArray(batchesRes.data)) {
        allTanks = batchesRes.data;
      } else if (batchesRes.data && Array.isArray(batchesRes.data.data)) {
        allTanks = batchesRes.data.data;
      } else if (batchesRes.data && Array.isArray(batchesRes.data.batches)) {
        allTanks = batchesRes.data.batches;
      } else {
        console.error("❌ API response is not an array:", batchesRes.data);
        console.error("Response type:", typeof batchesRes.data);
        console.error("Full response:", batchesRes);
        // If API call failed, set empty array to prevent filter errors
        allTanks = [];
      }
      
      // Ensure tanks is always an array
      if (!Array.isArray(allTanks)) {
        console.error("⚠️ Tanks is not an array, setting to empty array");
        allTanks = [];
      }
      
      setTanks(allTanks);
      
      const activeTanksList = Array.isArray(allTanks) ? allTanks.filter(t => t.status === "active") : [];
      const motorStatusMap = {};
      
      for (const tank of activeTanksList) {
        try {
          // Ensure batchId is passed as string for consistent matching
          const motorRes = await API.get(`/motor/status?batchId=${String(tank.id)}`);
          const motorData = motorRes.data?.data || null;
          motorStatusMap[tank.id] = motorData;
          
          // Debug logging
          if (motorData) {
            console.log(`✅ Motor status for ${tank.batchName}:`, {
              state: motorData.state,
              speed: motorData.motor_speed,
              batchId: motorData.batchId,
              updated_at: motorData.updated_at
            });
          } else {
            console.log(`⚠️ No motor status found for ${tank.batchName} (batchId: ${tank.id})`);
          }
        } catch (error) {
          console.error(`Error fetching motor status for ${tank.batchName}:`, error);
          motorStatusMap[tank.id] = null;
        }
      }
      
      setMotorStatus(motorStatusMap);

      const feedingTimes = {};
      
      for (const tank of activeTanksList) {
        if (tank.lastFeedDate) {
          try {
            const feedDate = new Date(tank.lastFeedDate);
            if (!isNaN(feedDate.getTime())) {
              feedingTimes[tank.id] = tank.lastFeedDate;
              continue;
            }
          } catch (e) {
            // Invalid date, fall through to fallback
          }
        }
        
        try {
          const feedRes = await API.get(`/feeding/batch/${tank.id}`);
          const feedings = feedRes.data?.feedings || [];
          if (feedings.length > 0) {
            const lastFeeding = feedings[0];
            if (lastFeeding.date) {
              feedingTimes[tank.id] = lastFeeding.date;
            }
          }
        } catch (error) {
          // Silently handle errors
        }
      }
      setLastFeedingTimes(feedingTimes);
      
      if (showNotification) {
        showToast('Dashboard refreshed successfully!', 'success');
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast('Failed to load data. Please try again.', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const formatLastFeeding = (dateString) => {
    if (!dateString) return t("dashboard.never");
    try {
      let date;
      if (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-', 10)) {
        date = new Date(dateString);
      } else {
        date = new Date(dateString + 'Z');
      }
      
      if (isNaN(date.getTime())) return t("dashboard.never");
      
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return t("dashboard.justNow");
      if (diffMins < 60) return `${diffMins} ${t("dashboard.minAgo")}`;
      if (diffHours < 24) return `${diffHours} ${diffHours > 1 ? t("dashboard.hoursAgo") : t("dashboard.hourAgo")}`;
      if (diffDays === 1) return t("dashboard.yesterday");
      if (diffDays < 7) return `${diffDays} ${t("dashboard.daysAgo")}`;
      
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (error) {
      return t("dashboard.never");
    }
  };

  const getFeedingStatus = (tank) => {
    if (tank.status !== "active") return { text: "Not Started", icon: "⏸", color: "text-gray-500" };
    
    const tankMotorStatus = motorStatus && typeof motorStatus === 'object' && !Array.isArray(motorStatus) 
      ? motorStatus[tank.id] 
      : (typeof motorStatus === 'object' && motorStatus?.state ? motorStatus : null);
    
    if (!tankMotorStatus) return { text: "Unknown", icon: "❓", color: "text-gray-500" };
    
    const state = tankMotorStatus.state || "";
    if (state === "feeding_fast" || state === "high") {
      return { text: t("dashboard.feedingNow"), icon: "🟢", color: "text-green-600" };
    } else if (state === "feeding_slow" || state === "low") {
      return { text: t("dashboard.feedingSlow"), icon: "🟡", color: "text-yellow-600" };
    } else {
      return { text: t("dashboard.notFeeding"), icon: "⏸", color: "text-red-500" };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-base sm:text-lg">Loading tanks...</p>
        </div>
      </div>
    );
  }

  const activeTanks = Array.isArray(tanks) ? tanks.filter(t => t.status === "active") : [];
  const inactiveTanks = Array.isArray(tanks) ? tanks.filter(t => t.status !== "active") : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 sm:p-6">
      <ToastContainer />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{t("dashboard.title")}</h1>
              <p className="text-sm text-gray-600">{t("dashboard.subtitle")}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fetchAllData(true)}
                disabled={isRefreshing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-3 rounded-xl font-semibold disabled:opacity-50 text-base min-h-[48px] touch-manipulation shadow-sm"
              >
                {isRefreshing ? t("dashboard.refreshing") : `🔄 ${t("dashboard.refresh")}`}
              </button>
              <button
                onClick={() => navigate("/farmer-setup")}
                className="flex-1 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-4 py-3 rounded-xl font-semibold text-base min-h-[48px] touch-manipulation shadow-sm"
              >
                + {t("dashboard.newBatch")}
              </button>
            </div>
          </div>
        </div>

        {/* Active Tanks Section */}
        {activeTanks.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-4">
              <div className="w-1 h-6 sm:h-8 bg-green-500 rounded"></div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{t("dashboard.activeTanks")} ({activeTanks.length})</h2>
            </div>
            
            <div className="space-y-4">
              {activeTanks.map(tank => {
                const feedingStatus = getFeedingStatus(tank);
                const lastFeeding = formatLastFeeding(lastFeedingTimes[tank.id]);
                
                return (
                  <div
                    key={tank.id}
                    onClick={() => navigate(`/batch/${tank.id}`)}
                    className="bg-white border-2 border-blue-200 rounded-2xl p-5 shadow-md active:shadow-lg active:border-blue-400 transition-all cursor-pointer touch-manipulation"
                  >
                    {/* Header with Tank Name and Status */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="text-3xl flex-shrink-0"></div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-bold text-gray-900 truncate">{tank.batchName}</h3>
                          <span className="inline-block mt-1 px-3 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            {t("dashboard.active")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Feeding Status - Most Important Info */}
                    <div className={`mb-4 p-4 rounded-xl ${
                      feedingStatus.text === t("dashboard.feedingNow") 
                        ? "bg-green-50 border-2 border-green-300" 
                        : feedingStatus.text === t("dashboard.feedingSlow")
                        ? "bg-yellow-50 border-2 border-yellow-300"
                        : "bg-red-50 border-2 border-red-300"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{feedingStatus.icon}</span>
                          <div>
                            <p className="text-xs text-gray-600 mb-0.5">{t("dashboard.status")}</p>
                            <p className={`text-lg font-bold ${feedingStatus.color}`}>
                              {feedingStatus.text}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600 mb-0.5">{t("dashboard.lastFed")}</p>
                          <p className="text-base font-semibold text-gray-800">{lastFeeding}</p>
                        </div>
                      </div>
                    </div>

                    {/* Key Metrics - Clean Horizontal Layout */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-3 bg-blue-50 rounded-xl">
                        <p className="text-xs text-gray-600 mb-1"> {t("dashboard.currentAge")}</p>
                        <p className="text-lg font-bold text-blue-700">{tank.currentShrimpAge || tank.shrimpAge || 0}</p>
                        <p className="text-xs text-gray-500">days</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-xl">
                        <p className="text-xs text-gray-600 mb-1"> {t("dashboard.species")}</p>
                        <p className="text-sm font-bold text-purple-700 truncate">{tank.species || "N/A"}</p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-xl">
                        <p className="text-xs text-gray-600 mb-1"> PL Stocked</p>
                        <p className="text-sm font-bold text-orange-700">{tank.plStocked ? ((tank.plStocked / 1000).toFixed(0) + 'K') : '0'}</p>
                      </div>
                    </div>

                    {/* View Details Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/batch/${tank.id}`);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-3 rounded-xl font-semibold text-base shadow-sm active:shadow-md transition-all touch-manipulation"
                    >
                      {t("dashboard.viewDetails")} →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Inactive Tanks Section */}
        {inactiveTanks.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-4">
              <div className="w-1 h-6 sm:h-8 bg-gray-400 rounded"></div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{t("dashboard.inactiveTanks")} ({inactiveTanks.length})</h2>
            </div>
            
            <div className="space-y-4">
              {inactiveTanks.map(tank => (
                <div
                  key={tank.id}
                  onClick={() => navigate(`/batch/${tank.id}`)}
                  className="bg-white border-2 border-gray-200 rounded-2xl p-5 shadow-sm active:shadow-md active:border-gray-400 transition-all cursor-pointer touch-manipulation"
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-3xl"></div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-700 truncate">{tank.batchName}</h3>
                      <span className="inline-block mt-1 px-3 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs font-semibold">
                        {t("dashboard.inactive")}
                      </span>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-600 mb-1"> {t("dashboard.currentAge")}</p>
                      <p className="text-lg font-bold text-gray-700">{tank.shrimpAge || 0}</p>
                      <p className="text-xs text-gray-500">days</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-600 mb-1"> {t("dashboard.species")}</p>
                      <p className="text-sm font-bold text-gray-700 truncate">{tank.species || "N/A"}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-600 mb-1"> PL Stocked</p>
                      <p className="text-sm font-bold text-gray-700">{tank.plStocked ? ((tank.plStocked / 1000).toFixed(0) + 'K') : '0'}</p>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/batch/${tank.id}`);
                    }}
                    className="w-full bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white py-3 rounded-xl font-semibold text-base shadow-sm active:shadow-md transition-all touch-manipulation"
                  >
                    {t("dashboard.viewDetails")} →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {tanks.length === 0 && (
          <div className="text-center py-12 sm:py-20 bg-gray-50 rounded-lg border border-gray-200 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl sm:text-4xl"></span>
            </div>
            <p className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">{t("dashboard.noTanks")}</p>
            <p className="text-sm sm:text-base text-gray-600 mb-6">{t("dashboard.startByCreating")}</p>
            <button
              onClick={() => navigate("/farmer-setup")}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold text-base sm:text-lg min-h-[44px] touch-manipulation"
            >
              + {t("dashboard.addNewTank")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

