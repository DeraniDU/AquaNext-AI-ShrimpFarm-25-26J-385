import type { ReactNode } from 'react'

type NavItem = {
	id: string
	label: string
	icon: string
}

type Props = {
	activeView: string
	onViewChange: (view: string) => void
	isOpen: boolean
	onToggle: () => void
}

const navItems: NavItem[] = [
	{ id: 'dashboard',         label: 'Dashboard',         icon: '📊' },
	{ id: 'optimization',      label: 'Optimization',      icon: '⚡' },
	{ id: 'labor-optimization',label: 'Labor Optimization', icon: '👨‍🌾' },
	{ id: 'benchmarking',      label: 'Benchmarking',      icon: '📈' },
	{ id: 'water-quality',     label: 'Water Quality',     icon: '💧' },
	{ id: 'feeding',           label: 'Feeding',           icon: '🍽️' },
	{ id: 'disease-detection', label: 'Disease Detection', icon: '🦠' },
	{ id: 'settings',          label: 'Settings',          icon: '⚙️' },
]

export function Sidebar({ activeView, onViewChange, isOpen, onToggle }: Props) {
	const handleNav = (id: string) => {
		onViewChange(id)
		// Close sidebar on mobile after navigation
		if (window.innerWidth <= 768) onToggle()
	}

	return (
		<>
			{/* Mobile Overlay */}
			<div
				className={`sidebarOverlay ${isOpen ? 'open' : ''}`}
				onClick={onToggle}
				aria-hidden="true"
			/>

			<div className={`sidebar ${isOpen ? 'open' : ''}`} role="navigation" aria-label="Main navigation">
				<div className="sidebarHeader">
					<div className="sidebarBrand">
						<div className="sidebarBrandMark" aria-hidden="true" />
						<span className="sidebarBrandText">AquaNext AI</span>
					</div>
				</div>
				<nav className="sidebarNav">
					{navItems.map((item) => (
						<button
							key={item.id}
							className={`sidebarNavItem ${activeView === item.id ? 'active' : ''}`}
							onClick={() => handleNav(item.id)}
							type="button"
							aria-current={activeView === item.id ? 'page' : undefined}
						>
							<span className="sidebarNavIcon" aria-hidden="true">{item.icon}</span>
							<span className="sidebarNavLabel">{item.label}</span>
						</button>
					))}
				</nav>
			</div>
		</>
	)
}
