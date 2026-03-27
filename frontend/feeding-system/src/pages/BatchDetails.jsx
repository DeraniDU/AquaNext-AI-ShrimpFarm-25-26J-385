// src/pages/BatchDetails.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import { useTranslation } from "../hooks/useTranslation";
import { updateStepperFromChunk } from "../services/firebase";

export default function BatchDetails() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [batch, setBatch] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Daily Records state
  const [todayFeed, setTodayFeed] = useState(null);
  const [feedings, setFeedings] = useState([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [isSavingFeed, setIsSavingFeed] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Motor Status state
  const [motorStatus, setMotorStatus] = useState(null);
  const [motorHistory, setMotorHistory] = useState([]);
  const [isLoadingMotor, setIsLoadingMotor] = useState(false);
  const [isControllingMotor, setIsControllingMotor] = useState(false);
  const [detectionTimer, setDetectionTimer] = useState(15); // 15-second detection cycle
  const [liveProcessingTimer, setLiveProcessingTimer] = useState(15); // Timer for live processing chunks
  
  // Audio Upload state (for testing without hardware)
  const [selectedAudioFile, setSelectedAudioFile] = useState(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  
  // Live processing state
  const [liveProcessingChunks, setLiveProcessingChunks] = useState([]);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1);
  const [isLiveProcessing, setIsLiveProcessing] = useState(false);
  const [liveMotorStatus, setLiveMotorStatus] = useState({ state: "stopped", speed: 0.0 });
  const [lastMotorHistoryCount, setLastMotorHistoryCount] = useState(0);
  const [finalProcessedState, setFinalProcessedState] = useState(null); // Track final state after processing
  
  // Quick test state (simulate AI decisions)
  const [isTestingAI, setIsTestingAI] = useState(false);
  
  // Export state
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  // Active tab state
  const [activeTab, setActiveTab] = useState("feeding"); // "overview" or "feeding"

  useEffect(() => {
    fetchBatchDetails();
  }, [batchId]);

  useEffect(() => {
    if (batch && batch.status === "active") {
      fetchTodayFeedCalculation();
      fetchFeedingHistory();
      fetchMotorStatus();
      // Auto-refresh motor status every 15 seconds (matching AI detection cycle)
      const interval = setInterval(fetchMotorStatus, 15000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch?.status, batchId]); // Only depend on status and batchId to avoid unnecessary re-renders

  // Detection cycle timer (15 seconds countdown)
  useEffect(() => {
    if (batch && batch.status === "active") {
      const timer = setInterval(() => {
        setDetectionTimer(prev => {
          if (prev <= 1) {
            return 15; // Reset to 15 seconds
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [batch?.status]);

  const fetchBatchDetails = async () => {
    try {
      const res = await API.get(`/batch/${batchId}`);
      setBatch(res.data);
      setForm({
        batchName: res.data.batchName,
        species: res.data.species,
        plStocked: res.data.plStocked,
        shrimpAge: res.data.shrimpAge,
        pondSize: res.data.pondSize,
        pondSizeUnit: res.data.pondSizeUnit,
        cultivationType: res.data.cultivationType,
        feedBrand: res.data.feedBrand,
        survivalRate: res.data.survivalRate
      });
    } catch (error) {
      console.error("Error fetching batch details:", error);
      alert("Failed to load batch details");
      navigate("/farmer-setup");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async () => {
    try {
      await API.put(`/batch/${batchId}`, form);
      setIsEditing(false);
      fetchBatchDetails(); // refetch to get updated batch including currentShrimpAge
      alert("Batch updated successfully");
    } catch (error) {
      console.error("Error updating batch:", error);
      alert("Failed to update batch");
    }
  };

  const handleStartBatch = async () => {
    try {
      await API.post(`/batch/start/${batchId}`);
      fetchBatchDetails();
      alert("Batch started successfully!");
    } catch (error) {
      console.error("Error starting batch:", error);
      alert("Failed to start batch");
    }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`/batch/${batchId}`);
      alert("Batch deleted successfully");
      navigate("/farmer-setup");
    } catch (error) {
      console.error("Error deleting batch:", error);
      alert("Failed to delete batch");
    }
  };

  const handleArchive = async () => {
    try {
      await API.post(`/batch/archive/${batchId}`);
      alert("Batch archived successfully");
      navigate("/farmer-setup");
    } catch (error) {
      console.error("Error archiving batch:", error);
      alert("Failed to archive batch");
    }
  };

  // Daily Records Functions
  const fetchTodayFeedCalculation = async () => {
    if (!batch || batch.status !== "active") return;
    
    setIsLoadingFeed(true);
    try {
      const res = await API.get(`/feeding/calculate/${batchId}`);
      setTodayFeed(res.data);
    } catch (error) {
      console.error("Error fetching feed calculation:", error);
    } finally {
      setIsLoadingFeed(false);
    }
  };

  const fetchFeedingHistory = async () => {
    if (!batch || batch.status !== "active") return;
    
    setIsLoadingHistory(true);
    try {
      const res = await API.get(`/feeding/batch/${batchId}`);
      setFeedings(res.data.feedings || []);
    } catch (error) {
      console.error("Error fetching feeding history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchMotorStatus = async () => {
    setIsLoadingMotor(true);
    try {
      const [statusRes, historyRes] = await Promise.all([
        API.get("/motor/status"),
        API.get("/feeding-history?limit=20")
      ]);
      // Get the latest event with full details including confidence and source
      const latestEvent = historyRes.data?.events?.[0] || null;
      const statusData = statusRes.data?.data || null;
      
      // Merge status with latest event details (confidence, source)
      if (statusData && latestEvent) {
        setMotorStatus({
          ...statusData,
          confidence: latestEvent.confidence,
          source: latestEvent.source || latestEvent.to_state ? "ai_feeding" : "unknown"
        });
      } else {
        setMotorStatus(statusData);
      }
      
      const events = historyRes.data?.events || [];
      
      // Log fetched events for debugging
      if (events.length > 0) {
        console.log(`Fetched ${events.length} motor events:`, events.slice(0, 3).map(e => ({
          state: e.state || e.to_state,
          speed: e.motor_speed,
          time: e.created_at,
          source: e.source
        })));
      }
      
      // Check if new events were added
      const hasNewEvents = events.length > lastMotorHistoryCount;
      if (hasNewEvents && events.length > 0) {
        const latestEvent = events[0];
        console.log(` New Motor Event Added!`, {
          state: latestEvent.state || latestEvent.to_state,
          speed: latestEvent.motor_speed,
          time: latestEvent.created_at,
          totalEvents: events.length
        });
        setLastMotorHistoryCount(events.length);
      }
      
      setMotorHistory(events);
    } catch (error) {
      console.error("Error fetching motor status:", error);
    } finally {
      setIsLoadingMotor(false);
    }
  };

  // CRITICAL: Motor Control Functions - Immediate START/STOP
  const handleStartFeeding = async () => {
    setIsControllingMotor(true);
    try {
      await API.post("/motor/start");
      alert(" Feeding started!");
      // Refresh status immediately
      setTimeout(() => {
        fetchMotorStatus();
      }, 500);
    } catch (error) {
      console.error("Error starting feeding:", error);
      alert("Failed to start feeding. Please try again.");
    } finally {
      setIsControllingMotor(false);
    }
  };

  const handleStopFeeding = async () => {
    setIsControllingMotor(true);
    try {
      await API.post("/motor/stop");
      alert(" Feeding stopped immediately!");
      // Refresh status immediately
      setTimeout(() => {
        fetchMotorStatus();
      }, 500);
    } catch (error) {
      console.error("Error stopping feeding:", error);
      alert("Failed to stop feeding. Please try again.");
    } finally {
      setIsControllingMotor(false);
    }
  };

  // Audio Upload Handler (for testing without hardware)
  const handleAudioFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('audio/') || file.name.endsWith('.wav') || file.name.endsWith('.mp3')) {
        setSelectedAudioFile(file);
        setUploadResult(null);
      } else {
        alert("Please select an audio file (WAV, MP3, etc.)");
        e.target.value = '';
      }
    }
  };

  const handleUploadAudio = async () => {
    if (!selectedAudioFile) {
      alert("Please select an audio file first");
      return;
    }

    // Check file size (max 50MB)
    const maxSizeMB = 50;
    const fileSizeMB = selectedAudioFile.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      alert(`File is too large (${fileSizeMB.toFixed(2)} MB). Maximum size is ${maxSizeMB} MB.`);
      return;
    }

    setIsUploadingAudio(true);
    setUploadResult(null);
    setLiveProcessingChunks([]);
    setCurrentProcessingIndex(-1);
    setIsLiveProcessing(true);
    
    // Fetch current motor status before starting live processing
    try {
      const motorRes = await API.get("/motor/status");
      const currentMotor = motorRes.data?.data || {};
      const currentState = currentMotor.state || currentMotor.to_state || "stopped";
      const currentSpeed = currentMotor.motor_speed || 0.0;
      setLiveMotorStatus({ 
        state: currentState === "feeding_fast" ? "feeding_fast" : 
               currentState === "feeding_slow" ? "feeding_slow" : "stopped", 
        speed: currentSpeed 
      });
    } catch (error) {
      // If fetch fails, default to stopped
      setLiveMotorStatus({ state: "stopped", speed: 0.0 });
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedAudioFile);

      // Use longer timeout for audio processing (2 minutes)
      // Include batchId in the request as query parameter
      console.log(`📤 Uploading audio file for batch: ${batchId}`);
      const response = await API.post(`/ai-feeding/?batchId=${batchId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes timeout for audio processing
      });

      const allChunks = response.data.chunks || [];
      
      // Process chunks live, one every 15 seconds
      for (let i = 0; i < allChunks.length; i++) {
        setCurrentProcessingIndex(i);
        
        // Reset timer to 15 seconds when processing a new chunk
        setLiveProcessingTimer(15);
        
        // Add current chunk to live processing
        const chunk = allChunks[i];
        setLiveProcessingChunks(prev => [...prev, chunk]);
        
        // Update motor status based on confirmed label
        // ALWAYS update liveMotorStatus when confirmed, even if motor didn't change
        // This ensures finalProcessedState shows the correct current state
        if (chunk.decision_status === "Confirmed") {
          const newMotorState = chunk.label === "high" ? "feeding_fast" : 
                              chunk.label === "low" ? "feeding_slow" : "stopped";
          const newMotorSpeed = chunk.motor_speed || 0.0;
          
          // Check if motor state actually changed
          const motorChanged = liveMotorStatus.state !== newMotorState || 
                              Math.abs(liveMotorStatus.speed - newMotorSpeed) > 0.01;
          
          // ALWAYS update liveMotorStatus to reflect current confirmed state
          // This ensures we show the correct final state even if motor didn't change
          setLiveMotorStatus({ state: newMotorState, speed: newMotorSpeed });
          
          // Update Firebase /stepper (running + speed 0|1|2) so IoT/demo matches table
          updateStepperFromChunk(chunk).catch((e) => console.warn("Firebase update:", e?.message));
          
          if (motorChanged) {
            const motorActionText = newMotorState === "feeding_fast" ? " Motor changed to FAST (100%)" :
                                   newMotorState === "feeding_slow" ? " Motor changed to SLOW (40%)" :
                                   " Motor STOPPED (0%)";
            console.log(`Motor Status Changed: ${motorActionText}`);
          } else {
            console.log(`Motor Status Confirmed: ${newMotorState} (no change - motor already ${newMotorState})`);
          }
          
          // NOTE: Don't update history during live processing
          // Backend processes all chunks at once, so history will show events from later chunks
          // We'll update history only after processing is complete
        }
        
        // Wait 15 seconds before processing next chunk (except for last chunk)
        // Update timer every second during the wait
        if (i < allChunks.length - 1) {
          for (let second = 15; second > 0; second--) {
            setLiveProcessingTimer(second);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else {
          // Last chunk - reset timer
          setLiveProcessingTimer(15);
        }
      }

      // Save final processed state before clearing live processing
      const finalState = liveMotorStatus.state;
      const finalSpeed = liveMotorStatus.speed;
      const finalConfirmedChunks = liveProcessingChunks.filter(c => c.decision_status === "Confirmed");
      const finalConfirmed = finalConfirmedChunks[finalConfirmedChunks.length - 1];
      
      setFinalProcessedState({
        state: finalState,
        speed: finalSpeed,
        confidence: finalConfirmed?.confidence,
        timestamp: new Date()
      });

      setUploadResult({
        success: true,
        message: `Live processing complete! AI analyzed ${allChunks.length} chunks and made feeding decisions.`,
        chunks: allChunks
      });

      setCurrentProcessingIndex(-1);
      setIsLiveProcessing(false);

      // Update motor status and history AFTER processing is complete
      // Wait longer to ensure backend has saved all events
      console.log(` Waiting for backend to save events...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Fetch multiple times to ensure we get the latest events
      console.log(` Fetching motor status (attempt 1)...`);
      await fetchMotorStatus();
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`Fetching motor status (attempt 2)...`);
      await fetchMotorStatus();
      
      // Refresh feeding history to show new feeding record
      console.log(` Refreshing feeding history...`);
      await fetchFeedingHistory();
      
      console.log(` Processing complete - Final state: ${finalState} (${finalSpeed * 100}%)`);
      console.log(` Motor history count: ${motorHistory.length}`);
      
      // Keep final processed state visible for 30 seconds (longer so user can see it)
      // This ensures user sees the current state even if no new database event was created
      setTimeout(() => {
        setFinalProcessedState(null);
        console.log(` Cleared final processed state display`);
      }, 30000); // 30 seconds instead of 10

      // Clear file selection
      setSelectedAudioFile(null);
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error("Error uploading audio:", error);
      let errorMessage = "Failed to process audio. ";
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage += "Processing took too long. Try a shorter audio file or check your connection.";
      } else if (error.response?.data?.detail) {
        errorMessage += error.response.data.detail;
      } else {
        errorMessage += "Please try again.";
      }
      
      setUploadResult({
        success: false,
        message: errorMessage
      });
      setIsLiveProcessing(false);
      setCurrentProcessingIndex(-1);
    } finally {
      setIsUploadingAudio(false);
    }
  };

  // Quick Test: Simulate AI Decision (for testing without audio files)
  const handleSimulateAIDecision = async (prediction, confidence) => {
    setIsTestingAI(true);
    try {
      await API.post(`/ai-decision/?prediction=${prediction}&confidence=${confidence}`);
      alert(` Simulated AI Decision: ${prediction.toUpperCase()} (${(confidence * 100).toFixed(0)}% confidence)\n\nStatus will update in a few seconds!`);
      // Refresh status immediately
      setTimeout(() => {
        fetchMotorStatus();
      }, 1000);
    } catch (error) {
      console.error("Error simulating AI decision:", error);
      alert("Failed to simulate AI decision. Please try again.");
    } finally {
      setIsTestingAI(false);
    }
  };

  const handleRecordFeeding = async () => {
    if (!todayFeed) return;
    
    setIsSavingFeed(true);
    try {
      await API.post("/feeding/", { batchId });
      alert("Daily feeding recorded successfully!");
      // Refresh data
      fetchBatchDetails();
      fetchTodayFeedCalculation();
      fetchFeedingHistory();
    } catch (error) {
      console.error("Error recording feeding:", error);
      alert(error.response?.data?.detail || "Failed to record feeding");
    } finally {
      setIsSavingFeed(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      // Handle both ISO string and date objects
      let date = dateString instanceof Date ? dateString : new Date(dateString);
      
      // If it's a string, it might be UTC - ensure proper parsing
      if (typeof dateString === 'string' && !dateString.includes('Z') && !dateString.includes('+')) {
        // If no timezone info, assume it's UTC from backend
        date = new Date(dateString + 'Z');
      }
      
      if (isNaN(date.getTime())) return "N/A";
      
      // Convert to local time and format
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short" // Shows timezone like "PST" or "UTC+5:30"
      });
    } catch (error) {
      console.error("Error formatting date:", error, dateString);
      return "N/A";
    }
  };

  // Export Functions
  const handleExportCSV = async () => {
    if (!batchId) return;
    
    setIsExportingCSV(true);
    try {
      const response = await API.get(`/export/batch/${batchId}/csv`, {
        responseType: 'blob', // Important for file download
      });
      
      // Create blob and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `batch_${batchId}_feeding_history.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      alert("CSV file downloaded successfully!");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    if (!batchId) return;
    
    setIsExportingPDF(true);
    try {
      const response = await API.get(`/export/batch/${batchId}/pdf`, {
        responseType: 'blob', // Important for file download
      });
      
      // Check if response is actually a PDF (not an error message)
      if (response.data.type === 'application/json' || response.data.size < 100) {
        // Likely an error response
        const text = await response.data.text();
        let errorMessage = "Failed to export PDF.";
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.detail || errorMessage;
        } catch {
          errorMessage = text || errorMessage;
        }
        alert(`Error: ${errorMessage}`);
        return;
      }
      
      // Create blob and download
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
      let filename = `batch_${batchId}_feeding_report.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      alert("PDF report downloaded successfully!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      let errorMessage = "Failed to export PDF. Please try again.";
      
      if (error.response) {
        // Try to get error message from response
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            try {
              const errorData = JSON.parse(error.response.data);
              errorMessage = errorData.detail || errorMessage;
            } catch {
              // If it's not JSON, check if it's a blob
              if (error.response.data instanceof Blob) {
                error.response.data.text().then(text => {
                  try {
                    const errorData = JSON.parse(text);
                    errorMessage = errorData.detail || errorMessage;
                  } catch {
                    errorMessage = text || errorMessage;
                  }
                  alert(`Error: ${errorMessage}`);
                });
                return;
              }
            }
          } else if (error.response.data.detail) {
            errorMessage = error.response.data.detail;
          }
        }
        
        if (error.response.status === 500) {
          if (errorMessage.includes("reportlab")) {
            errorMessage = "PDF export requires server setup. Please contact administrator.";
          }
        }
      }
      
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const calculateStatistics = () => {
    if (!feedings || feedings.length === 0) {
      return {
        totalFeed: 0,
        averageFeed: 0,
        averageFeedRate: 0,
        totalDays: 0
      };
    }

    const totalFeed = feedings.reduce((sum, f) => sum + (f.feedAmountKg || 0), 0);
    const averageFeed = totalFeed / feedings.length;
    const totalFeedRate = feedings.reduce((sum, f) => sum + (f.feedRate || 0), 0);
    const averageFeedRate = totalFeedRate / feedings.length;

    return {
      totalFeed: totalFeed.toFixed(2),
      averageFeed: averageFeed.toFixed(2),
      averageFeedRate: (averageFeedRate * 100).toFixed(2),
      totalDays: feedings.length
    };
  };

  const stats = calculateStatistics();

  if (!batch) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-xl text-gray-500">Loading...</p>
    </div>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-700";
      case "active": return "bg-green-100 text-green-700";
      case "completed": return "bg-blue-100 text-blue-700";
      case "archived": return "bg-purple-100 text-purple-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  // ========== UNIFIED STATE NORMALIZATION ==========
  // Converts all state formats to: "HIGH", "LOW", or "NO"
  const normalizeFeedingState = (state) => {
    if (!state) return "NO";
    
    const stateLower = String(state).toLowerCase().trim();
    
    // HIGH states
    if (stateLower === "high" || stateLower === "feeding_fast" || stateLower === "feedingfast") {
      return "HIGH";
    }
    
    // LOW states
    if (stateLower === "low" || stateLower === "feeding_slow" || stateLower === "feedingslow") {
      return "LOW";
    }
    
    // NO/STOPPED states
    if (stateLower === "no" || stateLower === "stopped" || stateLower === "off") {
      return "NO";
    }
    
    // Default to NO if unrecognized (never return "Unknown")
    return "NO";
  };

  // Get normalized state from motor status
  const getCurrentFeedingState = () => {
    // Use live motor status during live processing
    if (isLiveProcessing && liveMotorStatus.state) {
      const state = liveMotorStatus.state;
      if (state === "feeding_fast") return "HIGH";
      if (state === "feeding_slow") return "LOW";
      if (state === "stopped") return "NO";
    }
    if (!motorStatus) return "NO";
    return normalizeFeedingState(motorStatus.state || motorStatus.to_state);
  };

  const getMotorStatusColor = (state) => {
    const normalized = normalizeFeedingState(state);
    switch (normalized) {
      case "HIGH":
        return "bg-green-500";
      case "LOW":
        return "bg-yellow-500";
      case "NO":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getMotorStatusLabel = (state) => {
    const normalized = normalizeFeedingState(state);
    switch (normalized) {
      case "HIGH":
        return t("motor.feedingFast");
      case "LOW":
        return t("motor.feedingSlow");
      case "NO":
        return t("motor.stopped");
      default:
        return t("motor.stopped"); // Never return "Unknown"
    }
  };

  const getFeedingStateDescription = (state) => {
    const normalized = normalizeFeedingState(state);
    switch (normalized) {
      case "HIGH":
        return ` ${t("batchDetails.feedingFastDesc")}`;
      case "LOW":
        return ` ${t("batchDetails.feedingSlowDesc")}`;
      case "NO":
        return ` ${t("batchDetails.notFeedingDesc")}`;
      default:
        return ` ${t("batchDetails.notFeedingDesc")}`;
    }
  };

  const canEdit = batch.status === "draft";
  const canDelete = batch.status === "draft";
  const canStart = batch.status === "draft";
  const canArchive = batch.status === "completed";

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto bg-gradient-to-b from-blue-50 to-white min-h-screen">
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <button onClick={() => navigate("/farmer-setup")} className="text-blue-600 hover:text-blue-800 active:text-blue-900 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base font-semibold touch-manipulation">
          ← {t("batchDetails.backToBatches")}
        </button>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 truncate">{batch.batchName}</h1>
            <span className={`inline-block px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-semibold ${getStatusColor(batch.status)}`}>
              {batch.status.toUpperCase()}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && !isEditing && <button onClick={() => setIsEditing(true)} className="bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold min-h-[44px] touch-manipulation">{t("batchDetails.edit")}</button>}
            {canStart && <button onClick={handleStartBatch} className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold min-h-[44px] touch-manipulation">{t("batchDetails.startBatch")}</button>}
            {canArchive && <button onClick={() => setShowArchiveConfirm(true)} className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold min-h-[44px] touch-manipulation">{t("batchDetails.archive")}</button>}
            {canDelete && <button onClick={() => setShowDeleteConfirm(true)} className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold min-h-[44px] touch-manipulation">{t("batchDetails.delete")}</button>}
          </div>
        </div>
      </div>

      {/* Batch Details */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6 md:p-8 mb-5 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 pb-3 border-b border-gray-200">{t("batchDetails.batchInformation")}</h2>
        {isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Batch Name */}
            <div>
              <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                {t("farmerSetup.batchName")} <span className="text-red-500">*</span>
              </label>
              <input 
                name="batchName" 
                value={form.batchName || ""} 
                onChange={handleChange} 
                placeholder={t("farmerSetup.batchName")} 
                className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition touch-manipulation" 
              />
            </div>

            {/* Species */}
            <div>
              <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                {t("farmerSetup.species")} <span className="text-red-500">*</span>
              </label>
              <select 
                name="species" 
                value={form.species || ""} 
                onChange={handleChange} 
                className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition touch-manipulation"
              >
                <option value="">{t("farmerSetup.species")}</option>
                <option value="Vannamei">Vannamei (White Shrimp)</option>
                <option value="Monodon">Monodon (Black Tiger)</option>
                <option value="Indicus">Indicus (Indian White)</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* PL Stocked */}
            <div>
              <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                {t("farmerSetup.plStocked")} <span className="text-red-500">*</span>
              </label>
              <input 
                name="plStocked" 
                type="number" 
                value={form.plStocked || ""} 
                onChange={handleChange} 
                placeholder={t("farmerSetup.plStocked")} 
                className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition touch-manipulation" 
              />
            </div>

            {/* Shrimp Age */}
            <div>
              <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                {t("farmerSetup.shrimpAge")} <span className="text-red-500">*</span>
              </label>
              <input 
                name="shrimpAge" 
                type="number" 
                value={form.shrimpAge || ""} 
                onChange={handleChange} 
                placeholder={t("farmerSetup.shrimpAge")} 
                className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition touch-manipulation" 
              />
            </div>

            {/* Pond Size */}
            <div>
              <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                {t("farmerSetup.pondSize")} <span className="text-red-500">*</span>
              </label>
              <input 
                name="pondSize" 
                type="number" 
                value={form.pondSize || ""} 
                onChange={handleChange} 
                placeholder={t("farmerSetup.pondSize")} 
                className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition touch-manipulation" 
              />
            </div>

            {/* Pond Size Unit */}
            <div>
              <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                {t("farmerSetup.pondSize")} Unit <span className="text-red-500">*</span>
              </label>
              <select 
                name="pondSizeUnit" 
                value={form.pondSizeUnit || "acre"} 
                onChange={handleChange} 
                className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition touch-manipulation"
              >
              <option value="acre">Acre</option>
              <option value="hectare">Hectare</option>
              <option value="sqm">Square Meters</option>
            </select>
            </div>

            {/* Cultivation Type */}
            <div>
              <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                {t("farmerSetup.cultivationType")} <span className="text-red-500">*</span>
              </label>
              <input 
                name="cultivationType" 
                value={form.cultivationType || ""} 
                onChange={handleChange} 
                placeholder={t("farmerSetup.cultivationType")} 
                className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition touch-manipulation" 
              />
            </div>

            {/* Feed Brand */}
            <div>
              <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                {t("farmerSetup.feedBrand")} <span className="text-red-500">*</span>
              </label>
              <input 
                name="feedBrand" 
                value={form.feedBrand || ""} 
                onChange={handleChange} 
                placeholder={t("farmerSetup.feedBrand")} 
                className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition touch-manipulation" 
              />
            </div>

            {/* Survival Rate */}
            <div>
              <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                {t("farmerSetup.survivalRate")} <span className="text-red-500">*</span>
              </label>
              <input 
                name="survivalRate" 
                type="number" 
                step="0.01" 
                min="0" 
                max="1"
                value={form.survivalRate || ""} 
                onChange={handleChange} 
                placeholder={t("farmerSetup.survivalRate")} 
                className="border-2 border-gray-300 rounded-xl px-4 py-3 text-base w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition touch-manipulation" 
              />
              <p className="mt-1.5 text-xs text-gray-500">Enter as decimal (e.g., 0.82 for 82%)</p>
            </div>

            {/* Action Buttons */}
            <div className="col-span-1 sm:col-span-2 flex flex-col sm:flex-row gap-3 mt-4">
              <button onClick={handleUpdate} className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3 rounded-xl font-semibold transition min-h-[48px] touch-manipulation">{t("batchDetails.saveChanges")}</button>
              <button onClick={() => { setIsEditing(false); setForm(batch); }} className="flex-1 sm:flex-none bg-gray-400 hover:bg-gray-500 active:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition min-h-[48px] touch-manipulation">{t("batchDetails.cancel")}</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <div className="pb-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("farmerSetup.species")}</p>
              <p className="text-lg font-bold text-gray-800">{batch.species || "N/A"}</p>
            </div>
            <div className="pb-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("dashboard.currentAge")}</p>
              <p className="text-lg font-bold text-blue-600">{batch.currentShrimpAge ?? batch.shrimpAge} days</p>
            </div>
            <div className="pb-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("farmerSetup.plStocked")}</p>
              <p className="text-lg font-bold text-gray-800">{batch.plStocked?.toLocaleString()}</p>
            </div>
            <div className="pb-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("farmerSetup.pondSize")}</p>
              <p className="text-lg font-bold text-gray-800">{batch.pondSize} {batch.pondSizeUnit}</p>
            </div>
            <div className="pb-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("farmerSetup.cultivationType")}</p>
              <p className="text-lg font-bold text-gray-800">{batch.cultivationType || "N/A"}</p>
            </div>
            <div className="pb-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("farmerSetup.feedBrand")}</p>
              <p className="text-lg font-bold text-gray-800">{batch.feedBrand || "N/A"}</p>
            </div>
            <div className="pb-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("farmerSetup.survivalRate")}</p>
              <p className="text-lg font-bold text-gray-800">{batch.survivalRate || "N/A"}</p>
            </div>
          </div>
        )}
      </div>

      {/* Daily Records Section */}
      {batch && batch.status === "active" && (
        <div className="space-y-6">
          {/* Today's Feed Calculation Card */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6 md:p-8 mb-5 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{t("batchDetails.todaysFeedCalculation")}</h2>
              <button
                onClick={fetchTodayFeedCalculation}
                disabled={isLoadingFeed}
                className="text-blue-600 hover:text-blue-700 active:text-blue-800 text-sm font-semibold disabled:opacity-50 flex items-center gap-2 transition touch-manipulation min-h-[44px]"
              >
                {isLoadingFeed ? t("batchDetails.refresh") + "..." : t("batchDetails.refresh")}
              </button>
            </div>
            
            {isLoadingFeed ? (
              <div className="text-center py-8 sm:py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-3"></div>
                <p className="text-gray-500">{t("batchDetails.calculating")}</p>
              </div>
            ) : todayFeed ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5 mb-5 sm:mb-6">
                <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border-2 border-blue-100 text-center">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">{t("batchDetails.day")}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-700">{t("batchDetails.day")} {todayFeed.day}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 sm:p-6 border-2 border-green-100 text-center">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">{t("batchDetails.biomass")}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-700">{todayFeed.biomass} kg</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 sm:p-6 border-2 border-purple-100 text-center">
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">{t("batchDetails.feedAmount")}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-700">{todayFeed.feedAmountKg} kg</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 sm:p-6 border-2 border-orange-100 text-center">
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">{t("batchDetails.feedRate")}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-orange-700">{(todayFeed.feedRate * 100).toFixed(1)}%</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-600">{t("batchDetails.calculating")}</p>
              </div>
            )}

            {todayFeed && (
              <div className="flex gap-4">
                <button
                  onClick={handleRecordFeeding}
                  disabled={isSavingFeed}
                  className={`flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 active:from-green-800 active:to-green-900 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-sm active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation ${
                    isSavingFeed ? "cursor-wait" : ""
                  }`}
                >
                  {isSavingFeed ? t("batchDetails.recording") : `✓ ${t("batchDetails.recordFeeding")}`}
                </button>
              </div>
            )}
          </div>

          {/* Statistics Summary */}
          {feedings.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-5 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800">{t("batchDetails.feedingStatistics")}</h3>
                <button
                  onClick={() => navigate(`/batch/${batchId}/analytics`)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:from-purple-800 active:to-pink-800 text-white px-4 sm:px-6 py-2.5 sm:py-2 rounded-xl font-semibold shadow-sm active:shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px] touch-manipulation text-sm sm:text-base"
                >
                  {t("batchDetails.viewFullAnalytics")}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg text-center">
                  <p className="text-xs text-gray-600 mb-1">{t("batchDetails.totalDaysRecorded")}</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.totalDays}</p>
                </div>
                <div className="bg-green-50 p-3 sm:p-4 rounded-lg text-center">
                  <p className="text-xs text-gray-600 mb-1">{t("batchDetails.totalFeedGiven")}</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.totalFeed} kg</p>
                </div>
                <div className="bg-purple-50 p-3 sm:p-4 rounded-lg text-center">
                  <p className="text-xs text-gray-600 mb-1">{t("batchDetails.averageDailyFeed")}</p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">{stats.averageFeed} kg</p>
                </div>
                <div className="bg-orange-50 p-3 sm:p-4 rounded-lg text-center">
                  <p className="text-xs text-gray-600 mb-1">{t("batchDetails.averageFeedRate")}</p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-600">{stats.averageFeedRate}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Feeding History Table */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6 md:p-8 mb-5 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 border-b border-gray-200">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{t("batchDetails.feedingHistory")}</h3>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {feedings.length > 0 && (
                  <>
                    <button
                      onClick={handleExportCSV}
                      disabled={isExportingCSV}
                      className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition shadow-sm active:shadow-md min-h-[44px] touch-manipulation"
                    >
                      {isExportingCSV ? `${t("common.export")}...` : t("batchDetails.exportCSV")}
                    </button>
                    <button
                      onClick={handleExportPDF}
                      disabled={isExportingPDF}
                      className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition shadow-sm active:shadow-md min-h-[44px] touch-manipulation"
                    >
                      {isExportingPDF ? `${t("common.export")}...` : t("batchDetails.exportPDF")}
                    </button>
                  </>
                )}
                <button
                  onClick={fetchFeedingHistory}
                  disabled={isLoadingHistory}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition shadow-sm active:shadow-md min-h-[44px] touch-manipulation"
                >
                  {isLoadingHistory ? t("common.loading") : t("batchDetails.refresh")}
                </button>
              </div>
            </div>

            {isLoadingHistory ? (
              <div className="text-center py-8">
                <p className="text-gray-500">{t("common.loading")}...</p>
              </div>
            ) : feedings.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl"></span>
                </div>
                <p className="text-gray-600 font-semibold mb-2">{t("batchDetails.noFeedingRecords")}</p>
                <p className="text-sm text-gray-500">{t("batchDetails.startRecording")}</p>
              </div>
            ) : (
              <>
                {/* Feed Calculation Reference Chart */}
                <div className="mb-6 sm:mb-8 bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                    <span className="text-xl sm:text-2xl"></span>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">{t("batchDetails.feedCalculationChart")}</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-5 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    {t("batchDetails.chartDescription")}
                  </p>
                  <div className="overflow-x-auto -mx-4 sm:mx-0 mb-4">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b-2 border-gray-200">
                            <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">{t("batchDetails.ageRange")}</th>
                            <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">{t("batchDetails.avgWeight")}</th>
                            <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">{t("batchDetails.feedRate")}</th>
                            <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">{t("batchDetails.feedTimesPerDay")}</th>
                            <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">{t("batchDetails.example")}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-800 whitespace-nowrap text-xs sm:text-sm">1-15 days</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-700 whitespace-nowrap text-xs sm:text-sm">1g</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold text-orange-600 whitespace-nowrap text-xs sm:text-sm">10.0%</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-700 whitespace-nowrap text-xs sm:text-sm">5 times</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-600 whitespace-nowrap text-xs sm:text-sm">82kg → 8.2kg</td>
                          </tr>
                          <tr className="hover:bg-yellow-50 bg-yellow-50/30 transition-colors">
                            <td className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-800 whitespace-nowrap text-xs sm:text-sm">16-30 days</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-700 whitespace-nowrap text-xs sm:text-sm">5g</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold text-orange-600 whitespace-nowrap text-xs sm:text-sm">6.0%</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-700 whitespace-nowrap text-xs sm:text-sm">4 times</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-600 whitespace-nowrap text-xs sm:text-sm">410kg → 24.6kg</td>
                          </tr>
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-800 whitespace-nowrap text-xs sm:text-sm">31-60 days</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-700 whitespace-nowrap text-xs sm:text-sm">12g</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold text-orange-600 whitespace-nowrap text-xs sm:text-sm">4.0%</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-700 whitespace-nowrap text-xs sm:text-sm">4 times</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-600 whitespace-nowrap text-xs sm:text-sm">984kg → 39.4kg</td>
                          </tr>
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-800 whitespace-nowrap text-xs sm:text-sm">61-90 days</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-700 whitespace-nowrap text-xs sm:text-sm">20g</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold text-orange-600 whitespace-nowrap text-xs sm:text-sm">3.0%</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-700 whitespace-nowrap text-xs sm:text-sm">3 times</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-600 whitespace-nowrap text-xs sm:text-sm">1,640kg → 49.2kg</td>
                          </tr>
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-800 whitespace-nowrap text-xs sm:text-sm">91+ days</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-700 whitespace-nowrap text-xs sm:text-sm">25g</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold text-orange-600 whitespace-nowrap text-xs sm:text-sm">2.0%</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-700 whitespace-nowrap text-xs sm:text-sm">3 times</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-600 whitespace-nowrap text-xs sm:text-sm">2,050kg → 41.0kg</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">
                      <span className="font-semibold">*</span> {t("batchDetails.exampleNote")}
                    </p>
                    <p className="text-xs text-blue-700 font-semibold">
                      💡 <strong>{t("batchDetails.currentBatch")}</strong> {batch?.currentShrimpAge || batch?.shrimpAge || 0} {t("batchDetails.daysBracket")} → {batch?.currentShrimpAge <= 15 ? "1-15 " + t("batchDetails.daysBracket") : batch?.currentShrimpAge <= 30 ? "16-30 " + t("batchDetails.daysBracket") : batch?.currentShrimpAge <= 60 ? "31-60 " + t("batchDetails.daysBracket") : batch?.currentShrimpAge <= 90 ? "61-90 " + t("batchDetails.daysBracket") : "91+ " + t("batchDetails.daysBracket")}
                    </p>
                  </div>
                </div>

              <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-lg border border-gray-200">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">{t("batchDetails.day")}</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">{t("common.date") || "Date"}</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">{t("batchDetails.biomass")} (kg)</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">{t("batchDetails.feedAmount")} (kg)</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">{t("batchDetails.feedRate")} (%)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {feedings.map((feeding, index) => (
                        <tr key={feeding.id || index} className="hover:bg-blue-50 transition-colors">
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{t("batchDetails.day")} {feeding.day}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-600 whitespace-nowrap">{formatDate(feeding.date)}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-semibold text-gray-800 whitespace-nowrap">{feeding.biomass?.toFixed(2) || "N/A"}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-bold text-green-600 whitespace-nowrap">{feeding.feedAmountKg?.toFixed(2) || "N/A"}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-bold text-orange-600 whitespace-nowrap">{(feeding.feedRate * 100)?.toFixed(1) || "N/A"}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </>
            )}
          </div>

          {/* CURRENT FEEDING STATUS - ONE CLEAR DISPLAY */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl shadow-2xl p-4 sm:p-6 md:p-8 border-4 border-blue-300 mb-5 sm:mb-6">
            <div className="text-center mb-4">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2"> CURRENT FEEDING STATUS</h3>
              <p className="text-xs sm:text-sm text-gray-600">Model analyzes audio every 15 seconds and automatically controls feeding</p>
            </div>
            
            {/* Main Status Badge - BIG & CLEAR */}
            {(() => {
              // During live processing, show the latest chunk's prediction
              let currentState = getCurrentFeedingState();
              if (isLiveProcessing && liveProcessingChunks.length > 0) {
                const latestChunk = liveProcessingChunks[liveProcessingChunks.length - 1];
                if (latestChunk.label) {
                  currentState = latestChunk.label.toUpperCase();
                }
              }
              
              const isHigh = currentState === "HIGH";
              const isLow = currentState === "LOW";
              const isNo = currentState === "NO";
              
              return (
                <div className="bg-white rounded-lg p-8 mb-6 border-2 border-gray-200">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4 font-semibold">
                      {t("batchDetails.aiDetectionStatus")}
                      {isLiveProcessing && (
                        <span className="ml-2 text-blue-600 animate-pulse"> {t("batchDetails.live")}</span>
                      )}
                    </p>
                    <div className={`inline-block px-6 sm:px-12 py-4 sm:py-6 rounded-xl border-4 mb-4 sm:mb-6 ${
                      isHigh ? "bg-green-100 border-green-500"
                      : isLow ? "bg-yellow-100 border-yellow-500"
                      : "bg-red-100 border-red-500"
                    } ${isLiveProcessing ? "animate-pulse" : ""}`}>
                      <p className={`text-4xl sm:text-6xl font-bold mb-3 ${
                        isHigh ? "text-green-700"
                        : isLow ? "text-yellow-700"
                        : "text-red-700"
                      }`}>
                        {currentState}
                      </p>
                      <p className="text-lg font-semibold text-gray-700">
                        {isLiveProcessing && liveProcessingChunks.length > 0 ? (
                          <>
                            {liveProcessingChunks[liveProcessingChunks.length - 1].decision_status === "Initializing" && ` ${t("batchDetails.initializing")}`}
                            {liveProcessingChunks[liveProcessingChunks.length - 1].decision_status?.includes("Waiting") && ` ${t("batchDetails.waiting")}`}
                            {liveProcessingChunks[liveProcessingChunks.length - 1].decision_status === "Confirmed" && ` ${t("batchDetails.confirmed")}`}
                          </>
                        ) : (
                          getFeedingStateDescription(motorStatus?.state || motorStatus?.to_state)
                        )}
                      </p>
                    </div>

                    {/* Status Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
                      <div className="text-center bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1 font-semibold">Feeding Sound</p>
                        <p className={`text-xl font-bold ${
                          isHigh || isLow ? "text-green-600" : "text-red-600"
                        }`}>
                          {isHigh || isLow ? " Detected" : " Not Detected"}
                        </p>
                      </div>
                      <div className="text-center bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1 font-semibold">Motor Status</p>
                        <p className={`text-xl font-bold ${
                          isHigh ? "text-green-600"
                          : isLow ? "text-yellow-600"
                          : "text-red-600"
                        }`}>
                          {isLiveProcessing ? (
                            liveMotorStatus.state === "feeding_fast" ? " ON (Fast)" :
                            liveMotorStatus.state === "feeding_slow" ? " ON (Slow)" :
                            " OFF"
                          ) : (
                            isHigh ? " ON (Fast)"
                            : isLow ? " ON (Slow)"
                            : " OFF"
                          )}
                        </p>
                      </div>
                      <div className="text-center bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1 font-semibold">Motor Speed</p>
                        <p className="text-xl font-bold text-blue-600">
                          {isLiveProcessing 
                            ? `${Math.round(liveMotorStatus.speed * 100)}%`
                            : motorStatus?.motor_speed ? `${(motorStatus.motor_speed * 100).toFixed(0)}%` : "0%"}
                        </p>
                      </div>
                    </div>

                    {/* AI Decision Info */}
                    {motorStatus && (
                      <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500 mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-600 mb-1 font-semibold">{t("batchDetails.decisionSource")}</p>
                            <p className="text-base font-bold text-blue-700">
                              {motorStatus.source === "ai_feeding" || motorStatus.source === "ai_decision"
                                ? ` ${t("batchDetails.aiDecision")}`
                                : motorStatus.source === "manual_start" || motorStatus.source === "manual_stop" || motorStatus.source === "manual_slow"
                                ? ` ${t("batchDetails.manualControl")}`
                                : ` ${t("batchDetails.aiDecision")}`}
                            </p>
                          </div>
                          {motorStatus.confidence !== undefined && motorStatus.confidence !== null && (
                            <div>
                              <p className="text-xs text-gray-600 mb-1 font-semibold">{t("batchDetails.aiConfidence")}</p>
                              <p className={`text-base font-bold ${
                                motorStatus.confidence >= 0.8
                                  ? "text-green-600"
                                  : motorStatus.confidence >= 0.6
                                  ? "text-yellow-600"
                                  : "text-red-600"
                              }`}>
                                {(motorStatus.confidence * 100).toFixed(0)}%
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-gray-600 mb-1 font-semibold">{t("batchDetails.lastUpdate")}</p>
                            <p className="text-sm font-semibold text-gray-700">
                              {formatDate(motorStatus.updated_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

            {/* TEST: Quick Test Buttons (Simulate AI Decisions) */}
            <div className="bg-yellow-50 rounded-xl p-4 sm:p-6 border-4 border-yellow-300 mt-5 sm:mt-6">
              <h4 className="text-lg sm:text-xl font-bold text-yellow-800 mb-2 text-center"> {t("batchDetails.quickTest")}</h4>
              <p className="text-xs sm:text-sm text-yellow-700 text-center mb-4">
                {t("batchDetails.quickTestDescription")}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <button
                  onClick={() => handleSimulateAIDecision("high", 0.95)}
                  disabled={isTestingAI}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 active:from-green-800 active:to-green-900 text-white font-bold py-4 px-4 sm:px-6 rounded-xl shadow-sm active:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
                >
                  {isTestingAI ? "..." : ` ${t("batchDetails.testHigh")}`}
                  <p className="text-xs mt-1 opacity-90">{t("motor.feedingFast")}</p>
                </button>
                
                <button
                  onClick={() => handleSimulateAIDecision("low", 0.75)}
                  disabled={isTestingAI}
                  className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 active:from-yellow-800 active:to-yellow-900 text-white font-bold py-4 px-4 sm:px-6 rounded-xl shadow-sm active:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
                >
                  {isTestingAI ? "..." : ` ${t("batchDetails.testLow")}`}
                  <p className="text-xs mt-1 opacity-90">{t("motor.feedingSlow")}</p>
                </button>
                
                <button
                  onClick={() => handleSimulateAIDecision("no", 0.90)}
                  disabled={isTestingAI}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:from-red-800 active:to-red-900 text-white font-bold py-4 px-4 sm:px-6 rounded-xl shadow-sm active:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
                >
                  {isTestingAI ? "..." : ` ${t("batchDetails.testNo")}`}
                  <p className="text-xs mt-1 opacity-90">{t("motor.stopped")}</p>
                </button>
              </div>
            </div>

            {/* TEST: Audio Upload Interface (For Testing Without Hardware) */}
            <div className="bg-purple-50 rounded-xl p-4 sm:p-6 border-4 border-purple-300 mt-5 sm:mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <h4 className="text-lg sm:text-xl font-bold text-purple-800"> {t("batchDetails.testUploadAudio")}</h4>
                {/* Next Detection Timer - Moved here for easy access */}
                <div className="bg-white rounded-lg px-4 py-2 border-2 border-purple-400">
                  <p className="text-xs text-gray-600 mb-1 font-semibold">
                    {isLiveProcessing ? t("batchDetails.nextChunk") : t("batchDetails.nextDetection")}
                  </p>
                  <p className={`text-lg font-bold ${
                    isLiveProcessing ? "text-purple-600 animate-pulse" : "text-blue-600"
                  }`}>
                    {isLiveProcessing ? liveProcessingTimer : detectionTimer}s
                  </p>
                  {isLiveProcessing && (
                    <p className="text-xs text-purple-600 mt-1"> {t("batchDetails.live")}</p>
                  )}
                </div>
              </div>
              <p className="text-xs sm:text-sm text-purple-700 text-center mb-3 sm:mb-4">
                {t("batchDetails.uploadWavDescription")}
              </p>
              <p className="text-xs text-purple-600 text-center mb-3 sm:mb-4">
                💡 {t("batchDetails.uploadTip")}
              </p>
              
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="audio/*,.wav,.mp3"
                      onChange={handleAudioFileSelect}
                      className="hidden"
                      id="audio-upload"
                    />
                    <div className="bg-white border-2 border-purple-400 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-purple-50 transition-colors">
                      {selectedAudioFile ? (
                        <div>
                          <p className="text-sm font-semibold text-purple-700">✓ {selectedAudioFile.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {(selectedAudioFile.size / 1024 / 1024).toFixed(2)} MB
                            {(selectedAudioFile.size / (1024 * 1024)) > 10 && (
                              <span className="text-yellow-600 ml-2"> {t("batchDetails.largeFileWarning")}</span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-semibold text-purple-700"> {t("batchDetails.clickToSelectAudio")}</p>
                          <p className="text-xs text-gray-500 mt-1">{t("batchDetails.audioFormats")}</p>
                        </div>
                      )}
                    </div>
                  </label>
                  
                  <button
                    onClick={handleUploadAudio}
                    disabled={!selectedAudioFile || isUploadingAudio}
                    className={`bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:from-purple-800 active:to-purple-900 text-white font-bold py-3 px-4 sm:px-6 rounded-xl shadow-sm active:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation text-sm sm:text-base ${
                      isUploadingAudio ? "cursor-wait" : ""
                    }`}
                  >
                    {isUploadingAudio ? (
                      <span className="flex items-center gap-2">
                        {isLiveProcessing ? (
                          <>
                            <span className="animate-pulse"></span>
                            {t("batchDetails.liveProcessing")}... ({currentProcessingIndex + 1}/{liveProcessingChunks.length + 1})
                          </>
                        ) : (
                          <>
                            <span className="animate-spin"></span>
                            {t("batchDetails.processingAudio")}
                          </>
                        )}
                      </span>
                    ) : (
                      ` ${t("batchDetails.processAudio")}`
                    )}
                  </button>
                </div>

                {/* Live Processing Status */}
                {isLiveProcessing && (
                  <div className="mt-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-400 rounded-xl p-4 sm:p-6 shadow-lg">
                    {/* Header - Mobile Friendly */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></span>
                        <p className="text-base sm:text-lg font-bold text-blue-800"> LIVE PROCESSING</p>
                      </div>
                      <p className="text-sm sm:text-base text-blue-600 font-semibold bg-white px-3 py-1.5 rounded-lg">
                        {t("batchDetails.processingChunk")} {currentProcessingIndex + 1} {t("batchDetails.of")} {liveProcessingChunks.length + (isUploadingAudio ? 1 : 0)}
                      </p>
                    </div>
                    
                    {/* Status Info - Stack on Mobile */}
                    <div className="bg-white rounded-xl p-4 sm:p-5 mb-3 shadow-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="text-xs sm:text-sm text-gray-600 font-semibold whitespace-nowrap">{t("batchDetails.currentMotorStatus")}:</span>
                          <span className={`text-base sm:text-lg font-bold ${
                            liveMotorStatus.state === "feeding_fast" ? "text-green-600" :
                            liveMotorStatus.state === "feeding_slow" ? "text-yellow-600" :
                            "text-red-600"
                          }`}>
                            {liveMotorStatus.state === "feeding_fast" ? " FAST" :
                             liveMotorStatus.state === "feeding_slow" ? " SLOW" :
                             " OFF"} ({Math.round(liveMotorStatus.speed * 100)}%)
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="text-xs sm:text-sm text-gray-600 font-semibold whitespace-nowrap">{t("common.nextUpdate") || "Next Update:"}</span>
                          <span className="text-base sm:text-lg font-bold text-blue-600">{liveProcessingTimer} {t("common.seconds") || "seconds"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {uploadResult && !isLiveProcessing && (
                  <div className="mt-4">
                    <div className={`rounded-lg p-4 border-2 ${
                      uploadResult.success 
                        ? "bg-green-50 border-green-400 text-green-800" 
                        : "bg-red-50 border-red-400 text-red-800"
                    }`}>
                      <p className="font-semibold">{uploadResult.success ? ` ${t("common.success")}!` : ` ${t("common.error")}`}</p>
                      <p className="text-sm mt-1">{uploadResult.message}</p>
                    </div>
                  </div>
                )}

                {/* Live Processing History Table - Updates in Real-Time */}
                {(isLiveProcessing || (uploadResult && uploadResult.success)) && (
                  <div className="mt-4 bg-white rounded-xl border-2 border-purple-300 p-4 sm:p-6 shadow-lg">
                    <div className="mb-4">
                      <h5 className="text-base sm:text-lg font-bold text-purple-800">
                        {isLiveProcessing ? "LIVE Processing History" : "Processing History"}
                      </h5>
                    </div>
                    
                    {/* Mobile: Horizontal Scroll Container */}
                    <div className="overflow-x-auto -mx-4 sm:mx-0 max-h-[400px] sm:max-h-96 overflow-y-auto touch-pan-x">
                      <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                        <table className="w-full text-xs sm:text-sm border-collapse">
                          <thead>
                            <tr className="bg-purple-100 sticky top-0 z-10">
                              <th className="border border-purple-300 px-3 sm:px-4 py-3 text-left font-bold text-purple-800 whitespace-nowrap min-w-[80px]">Time (s)</th>
                              <th className="border border-purple-300 px-3 sm:px-4 py-3 text-left font-bold text-purple-800 whitespace-nowrap min-w-[100px]">Prediction</th>
                              <th className="border border-purple-300 px-3 sm:px-4 py-3 text-left font-bold text-purple-800 whitespace-nowrap min-w-[90px]">Confidence</th>
                              <th className="border border-purple-300 px-3 sm:px-4 py-3 text-left font-bold text-purple-800 whitespace-nowrap min-w-[120px]">Decision Status</th>
                              <th className="border border-purple-300 px-3 sm:px-4 py-3 text-left font-bold text-purple-800 whitespace-nowrap min-w-[140px]">Motor Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(isLiveProcessing ? liveProcessingChunks : (uploadResult?.chunks || [])).map((chunk, idx) => {
                              const isCurrentlyProcessing = isLiveProcessing && idx === currentProcessingIndex;
                              const getRowColor = () => {
                                if (chunk.decision_status === "Confirmed") {
                                  if (chunk.label === "high") return "bg-green-50";
                                  if (chunk.label === "low") return "bg-yellow-50";
                                  if (chunk.label === "no") return "bg-red-50";
                                }
                                if (chunk.decision_status?.includes("Waiting") || chunk.decision_status === "Initializing") {
                                  if (chunk.label === "high") return "bg-green-100";
                                  if (chunk.label === "low") return "bg-yellow-100";
                                  if (chunk.label === "no") return "bg-red-100";
                                }
                                return "bg-gray-50";
                              };

                              const getMotorActionText = () => {
                                if (chunk.motor_speed === 1.0) return "Fast (100%)";
                                if (chunk.motor_speed === 0.4) return "Slow (40%)";
                                if (chunk.motor_speed === 0.0) return "OFF (0%)";
                                return `${(chunk.motor_speed * 100).toFixed(0)}%`;
                              };

                              return (
                                <tr 
                                  key={idx} 
                                  className={`${getRowColor()} ${isCurrentlyProcessing ? "ring-2 ring-blue-500 ring-offset-1" : ""} transition-all`}
                                >
                                  <td className="border border-purple-200 px-3 sm:px-4 py-3 font-mono text-xs sm:text-sm whitespace-nowrap">
                                    {chunk.time_start !== undefined && chunk.time_end !== undefined
                                      ? `${Math.round(chunk.time_start)}-${Math.round(chunk.time_end)}`
                                      : `${idx * 15}-${(idx + 1) * 15}`}
                                  </td>
                                  <td className="border border-purple-200 px-3 sm:px-4 py-3 font-semibold whitespace-nowrap">
                                    <span className={`px-2 py-1.5 rounded text-xs sm:text-sm ${
                                      chunk.label === "high" ? "bg-green-200 text-green-800" :
                                      chunk.label === "low" ? "bg-yellow-200 text-yellow-800" :
                                      "bg-red-200 text-red-800"
                                    }`}>
                                      {chunk.label?.toUpperCase() || "N/A"}
                                    </span>
                                  </td>
                                  <td className="border border-purple-200 px-3 sm:px-4 py-3 font-semibold whitespace-nowrap text-xs sm:text-sm">
                                    {chunk.confidence ? `${(chunk.confidence * 100).toFixed(1)}%` : "N/A"}
                                  </td>
                                  <td className="border border-purple-200 px-3 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm font-semibold">
                                    {chunk.decision_status || "N/A"}
                                  </td>
                                  <td className="border border-purple-200 px-3 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm font-semibold">
                                    {getMotorActionText()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {/* Mobile Scroll Hint */}
                    <p className="text-xs text-gray-500 text-center mt-3 sm:hidden">
                      ← Swipe to see all columns →
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* EMERGENCY MANUAL CONTROL - Only for emergencies */}
            <div className="bg-red-50 rounded-xl p-4 sm:p-6 border-4 border-red-400 mt-5 sm:mt-6">
              <div className="text-center mb-4">
                <h4 className="text-xl sm:text-2xl font-bold text-red-800 mb-2"> {t("batchDetails.emergencyManualControl")}</h4>
                <p className="text-xs sm:text-sm text-red-700 font-semibold">
                   {t("batchDetails.emergencyWarning")}
                </p>
                <p className="text-xs text-red-600 mt-2">
                  {t("batchDetails.emergencyDescription")}
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <button
                onClick={handleStartFeeding}
                disabled={isControllingMotor || getCurrentFeedingState() === "HIGH"}
                className={`bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 active:from-green-800 active:to-green-900 text-white text-lg sm:text-xl font-bold py-4 px-4 sm:px-6 rounded-xl shadow-sm active:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation ${
                  isControllingMotor ? "cursor-wait" : ""
                }`}
              >
                {isControllingMotor ? ` ${t("batchDetails.starting")}` : ` ${t("batchDetails.startFeeding")}`}
              </button>
              
              <button
                onClick={handleStopFeeding}
                disabled={isControllingMotor || getCurrentFeedingState() === "NO"}
                className={`bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:from-red-800 active:to-red-900 text-white text-lg sm:text-xl font-bold py-4 px-4 sm:px-6 rounded-xl shadow-sm active:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation ${
                  isControllingMotor ? "cursor-wait" : ""
                }`}
              >
                {isControllingMotor ? ` ${t("batchDetails.stopping")}` : ` ${t("batchDetails.stopFeeding")}`}
              </button>
              </div>
              
              <p className="text-center text-xs text-red-600 mt-4 font-semibold">
                 {t("batchDetails.emergencyDescription")}
              </p>
            </div>
          </div>
        )}

          {/* Recent Motor Events History */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900"> {t("motor.eventHistory")}</h3>
              <button
                onClick={fetchMotorStatus}
                disabled={isLoadingMotor}
                className="text-blue-600 hover:text-blue-800 active:text-blue-900 text-sm font-semibold disabled:opacity-50 touch-manipulation min-h-[44px]"
              >
                {isLoadingMotor ? t("common.loading") : ` ${t("common.refresh")}`}
              </button>
            </div>
            
            {/* Show Live Event during processing - Updates in real-time with current motor state */}
            {isLiveProcessing && (() => {
              // Use liveMotorStatus which updates when motor changes
              const liveNormalized = liveMotorStatus.state === "feeding_fast" ? "HIGH" :
                                    liveMotorStatus.state === "feeding_slow" ? "LOW" : "NO";
              
              // Get latest confirmed chunk for confidence
              const confirmedChunks = liveProcessingChunks.filter(c => c.decision_status === "Confirmed");
              const latestConfirmed = confirmedChunks[confirmedChunks.length - 1];
              
              return (
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg border-4 border-blue-400 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full ${
                      liveNormalized === "HIGH" ? "bg-green-500" :
                      liveNormalized === "LOW" ? "bg-yellow-500" : "bg-red-500"
                    }`}></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-lg text-gray-800">{liveNormalized}</p>
                        <span className="text-xs px-2 py-1 rounded-full font-semibold bg-blue-200 text-blue-700 animate-pulse">
                          LIVE
                        </span>
                        <span className="text-sm text-gray-600">
                          ({liveNormalized === "HIGH" ? "Feeding Fast" : 
                            liveNormalized === "LOW" ? "Feeding Slow" : "Stopped"})
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Speed: {(liveMotorStatus.speed * 100).toFixed(0)}%
                        {latestConfirmed?.confidence && (
                          <span className="ml-2 font-semibold text-green-600">
                            • AI Confidence: {(latestConfirmed.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 font-semibold"> Processing...</span>
                  </div>
                </div>
              );
            })()}

            {/* Show Final Processed State after processing completes - ALWAYS show if processing just completed */}
            {!isLiveProcessing && finalProcessedState && (() => {
              const finalNormalized = finalProcessedState.state === "feeding_fast" ? "HIGH" :
                                     finalProcessedState.state === "feeding_slow" ? "LOW" : "NO";
              
              // Check if this matches the latest database event (within last 5 seconds)
              const latestDbEvent = motorHistory[0];
              const eventTime = latestDbEvent?.created_at ? new Date(latestDbEvent.created_at) : null;
              const processedTime = finalProcessedState.timestamp;
              const timeDiff = eventTime ? Math.abs(processedTime - eventTime) / 1000 : Infinity; // seconds
              
              // Event matches if same state AND created within 5 seconds of processing
              const matchesDb = latestDbEvent && timeDiff < 5 && 
                (latestDbEvent.state === finalProcessedState.state || 
                 latestDbEvent.to_state === (finalProcessedState.state === "feeding_fast" ? "high" : 
                                            finalProcessedState.state === "feeding_slow" ? "low" : "no"));
              
              return (
                <div className="mb-4 p-4 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg border-4 border-green-400">
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full ${
                      finalNormalized === "HIGH" ? "bg-green-500" :
                      finalNormalized === "LOW" ? "bg-yellow-500" : "bg-red-500"
                    }`}></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-lg text-gray-800">{finalNormalized}</p>
                        <span className="text-xs px-2 py-1 rounded-full font-semibold bg-green-200 text-green-700">
                           Current State
                        </span>
                        {matchesDb ? (
                          <span className="text-xs px-2 py-1 rounded-full font-semibold bg-blue-200 text-blue-700">
                             Event Saved
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full font-semibold bg-yellow-200 text-yellow-700">
                             No change (motor already {finalNormalized})
                          </span>
                        )}
                        <span className="text-sm text-gray-600">
                          ({finalNormalized === "HIGH" ? "Feeding Fast" : 
                            finalNormalized === "LOW" ? "Feeding Slow" : "Stopped"})
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Speed: {(finalProcessedState.speed * 100).toFixed(0)}%
                        {finalProcessedState.confidence && (
                          <span className="ml-2 font-semibold text-green-600">
                            • AI Confidence: {(finalProcessedState.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 font-semibold">
                      {formatDate(finalProcessedState.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {motorHistory.length === 0 && !isLiveProcessing ? (
              <div className="text-center py-8 text-gray-500">
                <p>No motor events yet. Events will appear here when motor changes occur.</p>
                <p className="text-xs mt-2 text-gray-400">Try uploading an audio file or using manual controls.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {motorHistory.slice(0, 10).map((event, index) => {
                  // Highlight the most recent event
                  const isNewest = index === 0;
                  const eventState = event.state || event.to_state;
                  const normalizedState = normalizeFeedingState(eventState);
                  const eventSource = event.source || (event.confidence ? "ai_feeding" : "manual");
                  const isAI = eventSource === "ai_feeding" || eventSource === "ai_decision" || (event.confidence !== undefined && event.confidence !== null);
                  
                  // Ensure speed matches state - if NO/stopped, speed must be 0%
                  let correctSpeed = event.motor_speed || 0.0;
                  if (normalizedState === "NO" || normalizedState === "stopped") {
                    correctSpeed = 0.0;
                  } else if (normalizedState === "HIGH" && correctSpeed < 0.9) {
                    // HIGH should be 100% (1.0)
                    correctSpeed = 1.0;
                  } else if (normalizedState === "LOW" && (correctSpeed > 0.5 || correctSpeed < 0.3)) {
                    // LOW should be 40% (0.4)
                    correctSpeed = 0.4;
                  }
                  
                  return (
                    <div key={index} className={`flex items-center gap-4 p-4 rounded-lg border-l-4 transition-all ${
                      isAI ? "bg-blue-50 border-blue-400" : "bg-purple-50 border-purple-400"
                    } ${isNewest ? "ring-2 ring-green-400 ring-offset-2 animate-pulse" : ""}`}>
                      <div className={`w-4 h-4 rounded-full ${getMotorStatusColor(eventState)}`}></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-lg text-gray-800">
                            {normalizedState}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            isAI ? "bg-blue-200 text-blue-700" : "bg-purple-200 text-purple-700"
                          }`}>
                            {isAI ? "AI" : " Manual"}
                          </span>
                          <span className="text-sm text-gray-600">
                            ({getMotorStatusLabel(eventState)})
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Speed: {(correctSpeed * 100).toFixed(0)}%
                          {event.confidence !== undefined && event.confidence !== null && (
                            <span className={`ml-2 font-semibold ${
                              event.confidence >= 0.8 ? "text-green-600" : 
                              event.confidence >= 0.6 ? "text-yellow-600" : "text-red-600"
                            }`}>
                              • AI Confidence: {(event.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(event.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

      {/* Show message for non-active batches */}
      {batch && batch.status !== "active" && (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Daily Records</h2>
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl"></span>
      </div>
            <p className="text-gray-600 font-semibold mb-2">
              {batch.status === "draft" 
                ? "Start the batch to begin recording daily feedings" 
                : "This batch is not active. Daily records are only available for active batches."}
            </p>
            {batch.status === "draft" && (
              <button
                onClick={handleStartBatch}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-all"
              >
                Start Tank
              </button>
            )}
          </div>
      </div>
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-xl font-bold mb-4">Confirm Delete</h3>
            <p className="mb-6">Are you sure you want to delete this batch? This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)} className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
              <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-xl font-bold mb-4">Confirm Archive</h3>
            <p className="mb-6">Are you sure you want to archive this batch?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowArchiveConfirm(false)} className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
              <button onClick={handleArchive} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded">Archive</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
