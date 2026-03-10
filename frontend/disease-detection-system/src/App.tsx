import { useState } from 'react'
import HealthStatus from './components/HealthStatus'
import Navigation from './components/Navigation'
import Dashboard from './pages/Dashboard'
import RiskPredictionPage from './pages/RiskPredictionPage'
import BehaviorTrackingPage from './pages/BehaviorTrackingPage'
import PondStatusPage from './pages/PondStatusPage'
import PredictionsHistoryPage from './pages/PredictionsHistoryPage'
import './App.css'

type PageType = 'dashboard' | 'predict' | 'behavior' | 'status' | 'history'

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const renderPage = () => {
    switch (currentPage) {
      case 'predict':
        return <RiskPredictionPage />
      case 'behavior':
        return <BehaviorTrackingPage />
      case 'status':
        return <PondStatusPage />
      case 'history':
        return <PredictionsHistoryPage />
      case 'dashboard':
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="app-container">
      <Navigation
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="page-container">
          <HealthStatus />
          {renderPage()}
        </div>
      </main>
    </div>
  )
}

export default App
