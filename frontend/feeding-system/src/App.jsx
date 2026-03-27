// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import Navigation from "./components/Navigation";
import Dashboard from "./pages/Dashboard"; 
import FarmerSetup from "./pages/FarmerSetup";
import BatchDetails from "./pages/BatchDetails";
import Motor from "./pages/Motor";
import History from "./pages/History";
import Analytics from "./pages/Analytics";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

export default function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <Navigation />
          <Routes>
            {/* Default page - redirect to Dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" />} />

            {/* Dashboard Page */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Farmer Setup / Batches Page */}
            <Route path="/farmer-setup" element={<FarmerSetup />} />
            <Route path="/batch/:batchId" element={<BatchDetails />} />
            <Route path="/batch/:batchId/analytics" element={<Analytics />} />
            
            {/* Analytics Page - System View */}
            <Route path="/analytics" element={<Analytics />} />

            {/* Motor Status Page */}
            <Route path="/motor" element={<Motor />} />

            {/* History Page */}
            <Route path="/history" element={<History />} />
          </Routes>
          <PWAInstallPrompt />
        </div>
      </Router>
    </LanguageProvider>
  );
}
