import React from 'react'
import {
  BarChart3,
  TrendingUp,
  Activity,
  Fish,
  History,
  Menu,
  X,
} from 'lucide-react'
import './Navigation.css'

type PageType = 'dashboard' | 'predict' | 'behavior' | 'status' | 'history'

interface NavigationProps {
  currentPage: PageType
  onNavigate: (page: PageType) => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

function Navigation({
  currentPage,
  onNavigate,
  sidebarOpen,
  onToggleSidebar,
}: NavigationProps) {
  const menuItems: { id: PageType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={20} /> },
    { id: 'predict', label: 'Risk Prediction', icon: <TrendingUp size={20} /> },
    { id: 'behavior', label: 'Behavior Tracking', icon: <Activity size={20} /> },
    { id: 'status', label: 'Pond Status', icon: <Fish size={20} /> },
    { id: 'history', label: 'Prediction History', icon: <History size={20} /> },
  ]

  return (
    <nav className="navigation">
      <div className="nav-header">
        <h1 className="nav-title">
          <Fish size={28} /> Disease Detection
        </h1>
        <button className="nav-toggle" onClick={onToggleSidebar}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {sidebarOpen && (
        <div className="nav-menu">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </nav>
  )
}

export default Navigation
