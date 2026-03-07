// src/pages/Analytics.jsx - Enhanced Analytics Dashboard
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "../hooks/useTranslation";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import API from "../services/api";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Analytics() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [batch, setBatch] = useState(null);
  const [activeTab, setActiveTab] = useState("abw"); // "abw", "biomass", "fcr"
  const [viewMode, setViewMode] = useState(batchId ? "batch" : "system"); // "system" or "batch"
  const [allBatches, setAllBatches] = useState([]);
  const [selectedBatchFilter, setSelectedBatchFilter] = useState("all");

  // Determine view mode from URL
  useEffect(() => {
    if (batchId) {
      setViewMode("batch");
      // Reset analytics when switching to batch view to force reload
      setAnalytics(null);
      setIsLoading(true);
    } else {
      setViewMode("system");
      // Reset analytics when switching to system view
      setAnalytics(null);
      setIsLoading(true);
    }
  }, [batchId]);

  useEffect(() => {
    if (viewMode === "system") {
      fetchAllBatches();
      fetchSystemAnalytics();
    } else if (batchId) {
      console.log("Fetching batch analytics for batchId:", batchId);
      fetchBatchInfo();
      fetchAnalytics();
    }
  }, [batchId, startDate, endDate, viewMode]);

  // Debug: Log analytics data structure (must be before conditional returns)
  useEffect(() => {
    if (analytics) {
      console.log("Analytics data structure:", {
        hasFeedShrimpCorrelation: !!analytics.feedShrimpCorrelation,
        feedShrimpCorrelationLength: analytics.feedShrimpCorrelation?.length || 0,
        hasCycleFeedData: !!analytics.cycleFeedData,
        cycleFeedDataLength: analytics.cycleFeedData?.length || 0,
        hasAbwByWeek: !!analytics.abwByWeek,
        abwByWeekLength: analytics.abwByWeek?.length || 0,
        hasBiomassByWeek: !!analytics.biomassByWeek,
        biomassByWeekLength: analytics.biomassByWeek?.length || 0,
        hasFcrTrends: !!analytics.fcrTrends,
        fcrTrendsLength: analytics.fcrTrends?.length || 0,
      });
    }
  }, [analytics]);

  const fetchAllBatches = async () => {
    try {
      const res = await API.get("/batch");
      const activeBatches = (res.data || []).filter(b => b.status === "active");
      setAllBatches(activeBatches);
    } catch (error) {
      console.error("Error fetching batches:", error);
    }
  };

  const fetchBatchInfo = async () => {
    try {
      const res = await API.get(`/batch/${batchId}`);
      setBatch(res.data);
    } catch (error) {
      console.error("Error fetching batch:", error);
    }
  };

  const fetchSystemAnalytics = async () => {
    setIsLoading(true);
    try {
      let url = `/analytics/system`;
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await API.get(url);
      console.log("System analytics data received:", res.data);
      setAnalytics(res.data);
    } catch (error) {
      console.error("Error fetching system analytics:", error);
      console.error("Error details:", error.response?.data || error.message);
      alert("Failed to load system analytics: " + (error.response?.data?.detail || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      let url = `/analytics/batch/${batchId}`;
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await API.get(url);
      console.log("Analytics data received:", res.data);
      setAnalytics(res.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      console.error("Error details:", error.response?.data || error.message);
      alert("Failed to load analytics data: " + (error.response?.data?.detail || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === "system") {
      setBatch(null);
    }
  };

  const handleBatchSelect = (selectedBatchId) => {
    if (selectedBatchId === "all") {
      setSelectedBatchFilter("all");
      // Stay in system view
      navigate("/analytics");
    } else {
      setSelectedBatchFilter(selectedBatchId);
      // Navigate to batch view
      navigate(`/batch/${selectedBatchId}/analytics`);
    }
  };

  // ========== Chart 1: Feed Dispensing Follows Shrimp Response (24-hour correlation) ==========
  const correlationChart = analytics?.feedShrimpCorrelation && analytics.feedShrimpCorrelation.length > 0 ? {
    labels: analytics.feedShrimpCorrelation.map(d => d.time_label),
    datasets: [
      {
        label: 'Feed Rate',
        data: analytics.feedShrimpCorrelation.map(d => d.feed_rate),
        borderColor: 'rgb(30, 64, 175)', // Dark blue
        backgroundColor: 'rgba(30, 64, 175, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y',
      },
      {
        label: 'Shrimp Response',
        data: analytics.feedShrimpCorrelation.map(d => d.shrimp_response),
        borderColor: 'rgb(20, 184, 166)', // Teal
        backgroundColor: 'rgba(20, 184, 166, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y',
      }
    ]
  } : null;

  const correlationChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 10,
          font: {
            size: 11
          }
        }
      },
      title: {
        display: false, // Hide chart title, we show it in the UI
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 25,
          callback: function(value) {
            return value + '%';
          }
        },
        title: {
          display: true,
          text: 'Percentage (%)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time'
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    }
  };

  // ========== Chart 2: Detailed Feed Data Per Cycle (Grouped Bar Chart) ==========
  const cycleFeedChart = analytics?.cycleFeedData && analytics.cycleFeedData.length > 0 ? {
    labels: analytics.cycleFeedData.map(c => {
      // In system view, show date if available; in batch view, show cycle number
      if (viewMode === "system" && c.date) {
        const date = new Date(c.date);
        return `Cycle ${c.cycle} (${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
      }
      return `Cycle ${c.cycle}`;
    }),
    datasets: [
      {
        label: 'Dispensed',
        data: analytics.cycleFeedData.map(c => c.dispensed),
        backgroundColor: 'rgb(59, 130, 246)', // Blue
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      {
        label: 'Consumed',
        data: analytics.cycleFeedData.map(c => c.consumed),
        backgroundColor: 'rgb(34, 197, 94)', // Green
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
      {
        label: 'Wasted',
        data: analytics.cycleFeedData.map(c => c.wasted),
        backgroundColor: 'rgb(239, 68, 68)', // Red
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
      }
    ]
  } : null;

  const cycleFeedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 10,
          font: {
            size: 11
          }
        }
      },
      title: {
        display: false, // Hide chart title, we show it in the UI
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} kg`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 2,
          callback: function(value) {
            return value + ' kg';
          }
        },
        title: {
          display: true,
          text: t("analytics.totalFeedKg")
        }
      },
      x: {
        title: {
          display: true,
          text: viewMode === "system" ? `${t("analytics.totalCycles")} (${t("common.date")})` : t("analytics.totalCycles")
        }
      }
    }
  };

  // ========== Chart 3: ABW Growth (Area Chart) ==========
  // Handle both system and batch views
  // For batch view: prefer abwByWeek, but fallback to growthMetrics if no weekly data
  const abwData = (() => {
    if (viewMode === "system") {
      return analytics?.comparisonData?.abwByWeek;
    } else {
      // Batch view: try abwByWeek first
      if (analytics?.abwByWeek && analytics.abwByWeek.length > 0) {
        console.log("Using abwByWeek for ABW chart:", analytics.abwByWeek);
        return analytics.abwByWeek;
      }
      // Fallback to growthMetrics
      if (analytics?.growthMetrics && analytics.growthMetrics.length > 0) {
        console.log("Using growthMetrics for ABW chart:", analytics.growthMetrics);
        const mapped = analytics.growthMetrics.map((g) => ({
          week: Math.floor((g.day || 0) / 7) + 1,
          week_label: `Day ${g.day || ''}`,
          abw_g: g.abw_g || 0
        }));
        console.log("Mapped growthMetrics to abwData:", mapped);
        return mapped;
      }
      console.log("No ABW data available. analytics:", analytics);
      console.log("abwByWeek:", analytics?.abwByWeek);
      console.log("growthMetrics:", analytics?.growthMetrics);
      return [];
    }
  })();
  
  const abwChart = abwData && abwData.length > 0 ? {
    labels: abwData.map(w => w.week_label || `Day ${w.day || ''}`),
    datasets: [
      {
        label: viewMode === "system" ? `${t("analytics.systemAvgABW")} (g)` : `${t("analytics.averageBodyWeight")} (g)`,
        data: abwData.map(w => w.abw_g),
        borderColor: 'rgb(20, 184, 166)', // Teal
        backgroundColor: 'rgba(20, 184, 166, 0.3)',
        fill: true,
        tension: 0.4,
      }
    ]
  } : null;

  // ========== Chart 4: Biomass Estimates (Area Chart) ==========
  // For batch view: prefer biomassByWeek, but fallback to biomassTrend if no weekly data
  const biomassData = (() => {
    if (viewMode === "system") {
      return analytics?.comparisonData?.biomassByWeek;
    } else {
      // Batch view: try biomassByWeek first
      if (analytics?.biomassByWeek && analytics.biomassByWeek.length > 0) {
        console.log("Using biomassByWeek for biomass chart:", analytics.biomassByWeek);
        return analytics.biomassByWeek;
      }
      // Fallback to biomassTrend
      if (analytics?.biomassTrend && analytics.biomassTrend.length > 0) {
        console.log("Using biomassTrend for biomass chart:", analytics.biomassTrend);
        const mapped = analytics.biomassTrend.map((b, idx) => ({
          week: Math.floor((analytics?.growthMetrics?.[idx]?.day || idx) / 7) + 1,
          week_label: `Day ${analytics?.growthMetrics?.[idx]?.day || idx + 1}`,
          biomass_kg: b.biomassKg || 0
        }));
        console.log("Mapped biomassTrend to biomassData:", mapped);
        return mapped;
      }
      console.log("No biomass data available. analytics:", analytics);
      console.log("biomassByWeek:", analytics?.biomassByWeek);
      console.log("biomassTrend:", analytics?.biomassTrend);
      return [];
    }
  })();
  
  const biomassChart = biomassData && biomassData.length > 0 ? {
    labels: biomassData.map(w => w.week_label || `Day ${w.day || ''}`),
    datasets: [
      {
        label: viewMode === "system" ? `${t("analytics.systemTotalBiomass")} (kg)` : `${t("analytics.totalBiomass")} (kg)`,
        data: biomassData.map(w => w.biomass_kg || w.biomassKg),
        borderColor: 'rgb(20, 184, 166)', // Teal
        backgroundColor: 'rgba(20, 184, 166, 0.3)',
        fill: true,
        tension: 0.4,
      }
    ]
  } : null;

  // ========== Chart 5: FCR Trends (Line Chart) ==========
  const fcrData = viewMode === "system"
    ? analytics?.comparisonData?.fcrTrends
    : analytics?.fcrTrends;
  
  const fcrChart = fcrData && fcrData.length > 0 ? {
    labels: fcrData.map(f => f.week_label),
    datasets: [
      {
        label: 'FCR',
        data: fcrData.map(f => f.fcr),
        borderColor: 'rgb(168, 85, 247)', // Purple
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
      }
    ]
  } : null;

  const abwBiomassChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 10,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: activeTab === 'abw' ? `${t("analytics.averageBodyWeight")} (g)` : `${t("analytics.totalBiomass")} (kg)`
        }
      },
      x: {
        title: {
          display: true,
          text: 'Weeks'
        }
      }
    }
  };

  const fcrChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return `FCR: ${context.parsed.y.toFixed(2)} (lower is better)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 0.9,
        max: 1.3,
        ticks: {
          stepSize: 0.1,
        },
        title: {
          display: true,
          text: 'FCR'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Weeks'
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-base sm:text-lg">{t("analytics.loadingAnalytics")}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    if (viewMode === "batch" && !batch) {
      return (
        <div className="p-6 max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600 mb-4">{t("analytics.noAnalyticsData")}</p>
            <button
              onClick={() => navigate("/farmer-setup")}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-2 rounded-lg min-h-[44px] touch-manipulation"
            >
              {t("analytics.backToBatches")}
            </button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-5 sm:mb-6">
          {viewMode === "batch" && batchId && (
            <button
              onClick={() => navigate(`/batch/${batchId}`)}
              className="text-blue-600 hover:text-blue-800 active:text-blue-900 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base font-semibold touch-manipulation"
            >
              ← {t("analytics.backToBatchDetails")}
            </button>
          )}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                📊 {t("analytics.title")}: {viewMode === "system" ? t("analytics.systemOverview") : (analytics?.batchName || t("common.loading"))}
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                {viewMode === "system" 
                  ? t("analytics.subtitleSystem")
                  : t("analytics.subtitleBatch")}
              </p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-gray-700">{t("analytics.viewMode")}</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => {
                    handleViewModeChange("system");
                    navigate("/analytics");
                  }}
                  className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all min-h-[44px] touch-manipulation ${
                    viewMode === "system"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                  }`}
                  title="See all batches combined - farm overview"
                >
                  🌐 {t("analytics.systemView")}
                </button>
                <button
                  onClick={() => {
                    if (allBatches.length > 0) {
                      handleViewModeChange("batch");
                      navigate(`/batch/${allBatches[0].id}/analytics`);
                    }
                  }}
                  className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all min-h-[44px] touch-manipulation ${
                    viewMode === "batch"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                  }`}
                  title="See one specific batch - detailed analysis"
                >
                  🎯 {t("analytics.batchView")}
                </button>
              </div>
            </div>
            
            {/* Quick Help */}
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <span>💡</span>
              <span>
                {viewMode === "system" 
                  ? t("analytics.systemViewHelp")
                  : t("analytics.batchViewHelp")}
              </span>
            </div>

            {/* Batch Selector for System View */}
            {viewMode === "system" && allBatches.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs sm:text-sm font-semibold text-gray-700">{t("analytics.filterByBatch")}</span>
                <select
                  value={selectedBatchFilter}
                  onChange={(e) => handleBatchSelect(e.target.value)}
                  className="px-3 sm:px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm touch-manipulation min-h-[44px]"
                >
                  <option value="all">{t("analytics.allBatches")} ({allBatches.length})</option>
                  {allBatches.map(batch => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-5 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold mb-4">{t("analytics.filterPeriod")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">{t("analytics.startDate")}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 touch-manipulation"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">{t("analytics.endDate")}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 touch-manipulation"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="w-full bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white px-4 py-2.5 rounded-xl font-semibold min-h-[44px] touch-manipulation"
              >
                {t("analytics.clearFilter")}
              </button>
            </div>
          </div>
        </div>

        {/* ========== Chart 1: Feed Dispensing Follows Shrimp Response ========== */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-5 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold mb-2">{t("analytics.feedDispensingTitle")}</h2>
          <p className="text-xs sm:text-sm text-gray-600 mb-4 italic text-center">
            {t("analytics.feedDispensingSubtitle")}
          </p>
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600">
              <strong>{t("analytics.howToRead")}</strong> {t("analytics.howToReadText")}
            </p>
          </div>
          {correlationChart ? (
            <div className="h-64 sm:h-80 md:h-96" style={{ position: 'relative' }}>
              <Line data={correlationChart} options={correlationChartOptions} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 sm:h-80 md:h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center px-4">
                <p className="text-gray-500 text-base sm:text-lg font-semibold mb-2">{t("analytics.noCorrelationData")}</p>
                <p className="text-gray-400 text-xs sm:text-sm">{t("analytics.noCorrelationDataDesc")}</p>
              </div>
            </div>
          )}
        </div>

        {/* ========== Chart 2: Detailed Feed Data Per Cycle ========== */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-5 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold mb-2">{t("analytics.detailedFeedDataTitle")}</h2>
          <p className="text-xs sm:text-sm text-gray-600 mb-4 italic text-center">
            {viewMode === "system" 
              ? t("analytics.detailedFeedDataSubtitleSystem")
              : t("analytics.detailedFeedDataSubtitleBatch")}
          </p>
          {viewMode === "system" && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs sm:text-sm text-blue-800">
                <strong>{t("analytics.systemViewNote")}</strong> {t("analytics.systemViewNoteText")}
                <br />
                <span className="text-xs mt-1 block">{t("analytics.systemViewExample")}</span>
              </p>
            </div>
          )}
          {viewMode === "batch" && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs sm:text-sm text-green-800">
                <strong>{t("analytics.batchViewNote")}</strong> {t("analytics.batchViewNoteText")}
                <br />
                <span className="text-xs mt-1 block">{t("analytics.batchViewExample")}</span>
              </p>
            </div>
          )}
          {cycleFeedChart ? (
            <>
              <div className="h-64 sm:h-80 md:h-96 mb-4 sm:mb-6" style={{ position: 'relative' }}>
                <Bar data={cycleFeedChart} options={cycleFeedChartOptions} />
              </div>
              
              {/* Summary Cards */}
              {analytics.feedSummary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6">
                  <div className="bg-blue-50 rounded-lg p-4 sm:p-6 text-center border-2 border-blue-200">
                    <p className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">
                      {analytics.feedSummary.totalDispensed} kg
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-700">{t("analytics.totalDispensed")}</p>
                    <p className="text-xs text-gray-500 mt-1">{t("analytics.totalDispensedDesc")}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 sm:p-6 text-center border-2 border-green-200">
                    <p className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">
                      {analytics.feedSummary.totalConsumed} kg
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-700">{t("analytics.totalConsumed")}</p>
                    <p className="text-xs text-gray-500 mt-1">{t("analytics.totalConsumedDesc")}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 sm:p-6 text-center border-2 border-red-200">
                    <p className="text-2xl sm:text-3xl font-bold text-red-600 mb-2">
                      {analytics.feedSummary.totalWasted} kg
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-700">
                      {t("analytics.totalWasted")} ({analytics.feedSummary.wastePercentage}%)
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{t("analytics.totalWastedDesc")}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <p className="text-gray-500 text-lg font-semibold mb-2">No Cycle Feed Data Available</p>
                <p className="text-gray-400 text-sm">Feed cycle data will appear here once feeding records are available</p>
              </div>
            </div>
          )}
        </div>

        {/* ========== Chart 3, 4, 5: ABW Growth & Biomass Analysis (Enhanced Design) ========== */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-5 sm:mb-6">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              {t("analytics.abwBiomassTitle")}
            </h2>
            <p className="text-gray-600 text-xs sm:text-sm">
              {t("analytics.abwBiomassSubtitle")}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Current ABW Card */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 sm:p-5 border-2 border-teal-200">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-teal-700">
                    {viewMode === "system" ? t("analytics.systemAvgABW") : t("analytics.currentABW")}
                  </p>
                  <p className="text-xs text-teal-600 mt-0.5">{t("analytics.averageBodyWeight")}</p>
                </div>
                <span className="text-xl sm:text-2xl">📈</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-teal-800">
                {abwData && abwData.length > 0
                  ? `${abwData[abwData.length - 1].abw_g} g`
                  : "N/A"}
              </p>
              {abwData && abwData.length > 1 && abwData[0].abw_g > 0 && (
                <p className="text-xs text-teal-600 mt-1">
                  ↑ {((abwData[abwData.length - 1].abw_g - abwData[0].abw_g) / abwData[0].abw_g * 100).toFixed(1)}% growth
                </p>
              )}
            </div>

            {/* Total Biomass Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 sm:p-5 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-blue-700">
                    {viewMode === "system" ? t("analytics.systemTotalBiomass") : t("analytics.totalBiomass")}
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">{t("analytics.totalShrimpWeight")}</p>
                </div>
                <span className="text-xl sm:text-2xl">⚖️</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-800">
                {biomassData && biomassData.length > 0
                  ? `${(biomassData[biomassData.length - 1].biomass_kg || biomassData[biomassData.length - 1].biomassKg || 0).toFixed(1)} kg`
                  : "N/A"}
              </p>
              {biomassData && biomassData.length > 1 && (
                (() => {
                  const first = biomassData[0].biomass_kg || biomassData[0].biomassKg || 0;
                  const last = biomassData[biomassData.length - 1].biomass_kg || biomassData[biomassData.length - 1].biomassKg || 0;
                  if (first > 0) {
                    return (
                      <p className="text-xs text-blue-600 mt-1">
                        ↑ {((last - first) / first * 100).toFixed(1)}% increase
                      </p>
                    );
                  }
                  return null;
                })()
              )}
            </div>

            {/* Average FCR Card */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 sm:p-5 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-purple-700">{t("analytics.avgFCR")}</p>
                  <p className="text-xs text-purple-600 mt-0.5">{t("analytics.feedConversionRatio")}</p>
                </div>
                <span className="text-xl sm:text-2xl">📊</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-purple-800">
                {fcrData && fcrData.length > 0
                  ? (fcrData.reduce((sum, f) => sum + f.fcr, 0) / fcrData.length).toFixed(2)
                  : "N/A"}
              </p>
              {fcrData && fcrData.length > 1 && (
                <p className="text-xs text-purple-600 mt-1">
                  {fcrData[fcrData.length - 1].fcr < fcrData[0].fcr ? "↓ Improving" : "↑ Needs attention"}
                </p>
              )}
            </div>
          </div>

          {/* Modern Tabs */}
          <div className="border-b-2 border-gray-200 mb-4 sm:mb-6 overflow-x-auto">
            <nav className="flex space-x-1 min-w-max sm:min-w-0" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("abw")}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-t-lg transition-all duration-200 min-h-[44px] touch-manipulation ${
                  activeTab === "abw"
                    ? "bg-teal-500 text-white shadow-md"
                    : "text-gray-600 hover:text-teal-600 hover:bg-gray-50 active:bg-gray-100"
                }`}
              >
                <span className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
                  <span>📈</span>
                  <span>{t("analytics.abwGrowth")}</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab("biomass")}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-t-lg transition-all duration-200 min-h-[44px] touch-manipulation ${
                  activeTab === "biomass"
                    ? "bg-teal-500 text-white shadow-md"
                    : "text-gray-600 hover:text-teal-600 hover:bg-gray-50 active:bg-gray-100"
                }`}
              >
                <span className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
                  <span>⚖️</span>
                  <span>{t("analytics.biomassEstimates")}</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab("fcr")}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-t-lg transition-all duration-200 min-h-[44px] touch-manipulation ${
                  activeTab === "fcr"
                    ? "bg-teal-500 text-white shadow-md"
                    : "text-gray-600 hover:text-teal-600 hover:bg-gray-50 active:bg-gray-100"
                }`}
              >
                <span className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
                  <span>📊</span>
                  <span>{t("analytics.fcrTrends")}</span>
                </span>
              </button>
            </nav>
          </div>

          {/* Tab Content with Better Layout */}
          <div className="h-64 sm:h-80 md:h-96">
            {activeTab === "abw" && (
              <div className="h-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">{t("analytics.abwGrowthTitle")}</h3>
                    <p className="text-xs text-gray-500 mt-1">{t("analytics.abwGrowthDesc")}</p>
                  </div>
                  {abwData && abwData.length > 0 && (
                    <span className="text-xs sm:text-sm text-gray-500">
                      {t("analytics.week")} {abwData[0].week} - {t("analytics.week")} {abwData[abwData.length - 1].week}
                    </span>
                  )}
                </div>
                {abwChart ? (
                  <div className="h-[calc(100%-4rem)] sm:h-[calc(100%-3rem)]" style={{ position: 'relative' }}>
                    <Line data={abwChart} options={abwBiomassChartOptions} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[calc(100%-4rem)] sm:h-[calc(100%-3rem)] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center px-4">
                      <p className="text-gray-500 text-base sm:text-lg font-semibold mb-2">{t("analytics.noABWData")}</p>
                      <p className="text-gray-400 text-xs sm:text-sm">{t("analytics.noABWDataDesc")}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === "biomass" && (
              <div className="h-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">{t("analytics.biomassEstimatesTitle")}</h3>
                    <p className="text-xs text-gray-500 mt-1">{t("analytics.biomassEstimatesDesc")} {viewMode === "system" ? t("analytics.systemView").toLowerCase() : t("analytics.batchView").toLowerCase()}</p>
                  </div>
                  {biomassData && biomassData.length > 0 && (
                    <span className="text-xs sm:text-sm text-gray-500">
                      {t("analytics.week")} {biomassData[0].week} - {t("analytics.week")} {biomassData[biomassData.length - 1].week}
                    </span>
                  )}
                </div>
                {biomassChart ? (
                  <div className="h-[calc(100%-4rem)] sm:h-[calc(100%-3rem)]" style={{ position: 'relative' }}>
                    <Line data={biomassChart} options={abwBiomassChartOptions} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[calc(100%-4rem)] sm:h-[calc(100%-3rem)] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center px-4">
                      <p className="text-gray-500 text-base sm:text-lg font-semibold mb-2">{t("analytics.noBiomassData")}</p>
                      <p className="text-gray-400 text-xs sm:text-sm">{t("analytics.noBiomassDataDesc")}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === "fcr" && (
              <div className="h-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">{t("analytics.fcrTrendsTitle")}</h3>
                    <p className="text-xs text-gray-500 mt-1">{t("analytics.fcrTrendsDesc")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">{t("analytics.lowerIsBetter")}</span>
                  </div>
                </div>
                {fcrChart ? (
                  <div className="h-[calc(100%-4rem)] sm:h-[calc(100%-3rem)]" style={{ position: 'relative' }}>
                    <Line data={fcrChart} options={fcrChartOptions} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[calc(100%-4rem)] sm:h-[calc(100%-3rem)] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center px-4">
                      <p className="text-gray-500 text-base sm:text-lg font-semibold mb-2">{t("analytics.noFCRData")}</p>
                      <p className="text-gray-400 text-xs sm:text-sm">{t("analytics.noFCRDataDesc")}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 text-center sm:text-left">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">
              {viewMode === "system" ? t("analytics.totalFeedAllBatches") : t("analytics.totalFeedPeriod")}
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">
              {viewMode === "system" 
                ? (analytics?.summary?.totalFeedKg || 0) 
                : (analytics?.summary?.totalFeedKg || 0)} kg
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {viewMode === "system" ? t("analytics.sumOfAllBatches") : t("analytics.forSelectedPeriod")}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 text-center sm:text-left">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">
              {viewMode === "system" ? t("analytics.totalBiomassLabel") : t("analytics.averageDailyFeed")}
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">
              {viewMode === "system"
                ? `${analytics?.summary?.totalBiomassKg || 0} kg`
                : `${analytics?.summary?.averageDailyFeedKg || 0} kg`}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {viewMode === "system" ? t("analytics.allBatchesCombined") : t("analytics.perDayAverage")}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 text-center sm:text-left">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">
              {viewMode === "system" ? t("analytics.averageABWLabel") : t("analytics.averageFeedRate")}
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600">
              {viewMode === "system"
                ? `${analytics?.summary?.averageABW || 0} g`
                : `${analytics?.summary?.averageFeedRate || 0}%`}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {viewMode === "system" ? t("analytics.acrossAllBatches") : t("analytics.percentageOfBiomass")}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 text-center sm:text-left">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">
              {viewMode === "system" ? t("analytics.activeBatches") : t("analytics.totalCycles")}
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-600">
              {viewMode === "system"
                ? analytics?.totalBatches || 0
                : analytics?.summary?.totalCycles || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {viewMode === "system" ? t("analytics.currentlyActive") : t("analytics.feedingDays")}
            </p>
          </div>
        </div>

        {/* Growth Rate - Only for batch view */}
        {viewMode === "batch" && analytics?.summary?.averageGrowthRate_g_per_day > 0 && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg p-4 sm:p-6 mb-5 sm:mb-6 text-white text-center sm:text-left">
            <p className="text-xs sm:text-sm font-semibold mb-1">{t("analytics.averageGrowthRate")}</p>
            <p className="text-2xl sm:text-3xl font-bold">{analytics.summary.averageGrowthRate_g_per_day} g/day</p>
            <p className="text-xs sm:text-sm mt-2 opacity-90">{t("analytics.growthRateDesc")}</p>
          </div>
        )}

        {/* Batch Comparison Table - Only for system view */}
        {viewMode === "system" && analytics?.batches && analytics.batches.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-5 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">{t("analytics.batchComparison")}</h2>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">{t("analytics.batchTankName")}</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">{t("analytics.totalFeedKg")}</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">{t("analytics.totalBiomassKg")}</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">{t("analytics.avgABW")}</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">{t("analytics.feedingDaysLabel")}</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">{t("analytics.viewDetails")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {analytics.batches.map((batch) => (
                      <tr key={batch.batchId} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold whitespace-nowrap">{batch.batchName}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-blue-600 whitespace-nowrap">{batch.totalFeedKg} kg</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-green-600 whitespace-nowrap">{batch.totalBiomassKg} kg</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-purple-600 whitespace-nowrap">{batch.averageABW} g</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-orange-600 whitespace-nowrap">{batch.totalCycles}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                          <button
                            onClick={() => {
                              console.log("Navigating to batch:", batch.batchId);
                            navigate(`/batch/${batch.batchId}/analytics`);
                          }}
                          className="text-blue-600 hover:text-blue-800 active:text-blue-900 font-semibold hover:underline transition-all touch-manipulation"
                        >
                          {t("analytics.viewDetails")} →
                        </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
