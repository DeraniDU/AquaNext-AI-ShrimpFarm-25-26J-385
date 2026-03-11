import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, TrendingUp, Fish } from 'lucide-react';
import Dashboard from './components/Dashboard';
import PondSelector from './components/PondSelector';
import { healthCheck } from './services/api';

function App() {
  const [selectedPond, setSelectedPond] = useState('pond-01');
  const [isHealthy, setIsHealthy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await healthCheck();
        setIsHealthy(true);
      } catch (err) {
        console.error('Backend connection failed:', err);
        setIsHealthy(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg">
                <Fish className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Disease Detection System</h1>
                <p className="text-sm text-gray-300">Real-time Shrimp Pond Monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isLoading ? (
                <div className="text-yellow-400 text-sm">Connecting...</div>
              ) : isHealthy ? (
                <div className="flex items-center gap-2 text-green-400">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">System Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400">
                  <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Connection Error</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Pond Selector */}
      <PondSelector selectedPond={selectedPond} onPondChange={setSelectedPond} />

      {/* Main Dashboard */}
      {isHealthy && <Dashboard pondId={selectedPond} />}

      {!isHealthy && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
            <p className="text-gray-300 mb-4">Unable to connect to backend server at http://localhost:8001</p>
            <p className="text-sm text-gray-400">Please ensure the backend is running with: <code className="bg-black/30 px-2 py-1 rounded">python main.py</code></p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
