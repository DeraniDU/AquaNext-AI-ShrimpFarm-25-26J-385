import { useState } from 'react'
import type {
	HardwareDevice,
	TriggerConfig,
	TriggerEvent,
	ManualOverride
} from '../lib/types'

// ============================================================
// TYPES
// ============================================================

interface AutoTriggerPanelProps {
	systemEnabled: boolean
	setSystemEnabled: (enabled: boolean) => void
	devices: HardwareDevice[]
	configs: TriggerConfig[]
	events: TriggerEvent[]
	manualOverrides: ManualOverride[]
	esp32Connected: 'connected' | 'disconnected' | 'reconnecting'
	lastCheck: string
	onManualOverride: (deviceId: string, enabled: boolean, powerLevel: number, duration: number | null, reason: string) => void
	onToggleConfig: (configId: string, enabled: boolean) => void
	onStopDevice: (deviceId: string) => void
	onAcknowledgeEvent: (eventId: string) => void
}

// ============================================================
// INLINE STYLES
// ============================================================

const styles = {
	panel: {
		background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
		borderRadius: 16,
		boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
		overflow: 'hidden',
		border: '1px solid rgba(226, 232, 240, 0.8)',
	},
	header: {
		padding: '20px 24px',
		background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
		color: '#fff',
	},
	headerContent: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 16,
	},
	headerLeft: {
		display: 'flex',
		alignItems: 'center',
		gap: 16,
	},
	iconBox: {
		width: 48,
		height: 48,
		borderRadius: 12,
		background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
	},
	headerTitle: {
		fontSize: '1.25rem',
		fontWeight: 700,
		margin: 0,
		letterSpacing: '-0.025em',
	},
	headerSubtitle: {
		fontSize: '0.875rem',
		color: 'rgba(255, 255, 255, 0.7)',
		marginTop: 4,
		display: 'flex',
		alignItems: 'center',
		gap: 8,
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: '50%',
	},
	toggle: {
		position: 'relative' as const,
		width: 56,
		height: 28,
		borderRadius: 14,
		cursor: 'pointer',
		transition: 'all 0.3s ease',
	},
	toggleKnob: {
		position: 'absolute' as const,
		width: 24,
		height: 24,
		borderRadius: 12,
		background: '#fff',
		top: 2,
		transition: 'all 0.3s ease',
		boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
	},
	tabBar: {
		display: 'flex',
		borderBottom: '1px solid #e2e8f0',
		background: '#f8fafc',
	},
	tab: {
		flex: 1,
		padding: '16px 20px',
		fontSize: '0.875rem',
		fontWeight: 600,
		color: '#64748b',
		border: 'none',
		background: 'transparent',
		cursor: 'pointer',
		transition: 'all 0.2s ease',
		position: 'relative' as const,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	tabActive: {
		color: '#0f172a',
		background: '#fff',
	},
	tabIndicator: {
		position: 'absolute' as const,
		bottom: 0,
		left: 0,
		right: 0,
		height: 3,
		background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
		borderRadius: '3px 3px 0 0',
	},
	tabBadge: {
		padding: '2px 8px',
		borderRadius: 12,
		fontSize: '0.75rem',
		fontWeight: 600,
	},
	content: {
		padding: 20,
		maxHeight: 520,
		overflowY: 'auto' as const,
	},
	deviceCard: {
		padding: 20,
		borderRadius: 12,
		border: '1px solid #e2e8f0',
		background: '#fff',
		transition: 'all 0.2s ease',
		position: 'relative' as const,
	},
	deviceCardRunning: {
		borderColor: '#22c55e',
		background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, #fff 100%)',
		boxShadow: '0 0 0 1px rgba(34, 197, 94, 0.1), 0 4px 12px rgba(34, 197, 94, 0.1)',
	},
	deviceCardError: {
		borderColor: '#ef4444',
		background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, #fff 100%)',
	},
	statusIndicator: {
		position: 'absolute' as const,
		top: 16,
		right: 16,
		width: 12,
		height: 12,
		borderRadius: '50%',
		boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.8)',
	},
	deviceName: {
		fontSize: '1rem',
		fontWeight: 700,
		color: '#0f172a',
		marginBottom: 4,
	},
	deviceMeta: {
		display: 'flex',
		alignItems: 'center',
		gap: 12,
		fontSize: '0.8rem',
		color: '#64748b',
		marginBottom: 12,
	},
	deviceTypeBadge: {
		padding: '4px 10px',
		borderRadius: 6,
		fontSize: '0.7rem',
		fontWeight: 600,
		background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
		color: '#475569',
		textTransform: 'uppercase' as const,
		letterSpacing: '0.05em',
	},
	powerBar: {
		marginTop: 16,
		padding: 12,
		background: '#f8fafc',
		borderRadius: 8,
	},
	powerBarTrack: {
		height: 6,
		background: '#e2e8f0',
		borderRadius: 3,
		overflow: 'hidden',
	},
	powerBarFill: {
		height: '100%',
		background: 'linear-gradient(90deg, #22c55e, #16a34a)',
		borderRadius: 3,
		transition: 'width 0.5s ease',
	},
	button: {
		padding: '10px 16px',
		borderRadius: 8,
		fontSize: '0.875rem',
		fontWeight: 600,
		border: 'none',
		cursor: 'pointer',
		transition: 'all 0.2s ease',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	buttonPrimary: {
		background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
		color: '#fff',
		boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
	},
	buttonDanger: {
		background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
		color: '#fff',
		boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
	},
	footer: {
		padding: '12px 20px',
		background: '#f8fafc',
		borderTop: '1px solid #e2e8f0',
		display: 'flex',
		justifyContent: 'space-between',
		fontSize: '0.8rem',
		color: '#64748b',
	},
}

// ============================================================
// HELPERS
// ============================================================

function getStatusColor(status: string): string {
	switch (status) {
		case 'running': return '#22c55e'
		case 'standby': return '#94a3b8'
		case 'error': return '#ef4444'
		case 'maintenance': return '#f59e0b'
		default: return '#94a3b8'
	}
}

function formatTime(isoString: string): string {
	const date = new Date(isoString)
	return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatTimeAgo(isoString: string): string {
	const diff = Date.now() - new Date(isoString).getTime()
	const seconds = Math.floor(diff / 1000)
	if (seconds < 60) return `${seconds}s ago`
	const minutes = Math.floor(seconds / 60)
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.floor(minutes / 60)
	return `${hours}h ago`
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function SystemHeader({
	enabled,
	onToggle,
	esp32Status,
	lastCheck
}: {
	enabled: boolean
	onToggle: (e: boolean) => void
	esp32Status: 'connected' | 'disconnected' | 'reconnecting'
	lastCheck: string
}) {
	return (
		<div style={styles.header}>
			<div style={styles.headerContent}>
				<div style={styles.headerLeft}>
					<div style={styles.iconBox}>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
						</svg>
					</div>
					<div>
						<h2 style={styles.headerTitle}>Automatic Trigger System</h2>
						<div style={styles.headerSubtitle}>
							<span style={{
								...styles.statusDot,
								background: esp32Status === 'connected' ? '#22c55e' :
									esp32Status === 'reconnecting' ? '#f59e0b' : '#ef4444',
								boxShadow: esp32Status === 'connected' ? '0 0 8px rgba(34, 197, 94, 0.6)' :
									esp32Status === 'reconnecting' ? '0 0 8px rgba(245, 158, 11, 0.6)' : '0 0 8px rgba(239, 68, 68, 0.6)',
							}} />
							<span>ESP32 {esp32Status === 'connected' ? 'Connected' : esp32Status === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}</span>
							<span style={{ opacity: 0.5 }}>|</span>
							<span>Updated {formatTimeAgo(lastCheck)}</span>
						</div>
					</div>
				</div>
				
				<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
					<span style={{ fontSize: '0.875rem', fontWeight: 500, opacity: 0.9 }}>
						{enabled ? 'System Active' : 'System Disabled'}
					</span>
					<div 
						style={{
							...styles.toggle,
							background: enabled ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'rgba(255, 255, 255, 0.2)',
						}}
						onClick={() => onToggle(!enabled)}
					>
						<div style={{
							...styles.toggleKnob,
							left: enabled ? 30 : 2,
						}} />
					</div>
				</div>
			</div>
		</div>
	)
}

function DeviceCard({
	device,
	onManualOverride,
	onStop
}: {
	device: HardwareDevice
	override?: ManualOverride
	onManualOverride: (deviceId: string, enabled: boolean, powerLevel: number, duration: number | null, reason: string) => void
	onStop: (deviceId: string) => void
}) {
	const [showOverrideModal, setShowOverrideModal] = useState(false)
	const [overridePower, setOverridePower] = useState(70)
	const [overrideDuration, setOverrideDuration] = useState<number | null>(30)
	const [overrideReason, setOverrideReason] = useState('')
	
	const deviceIcon = device.type === 'aerator' ? 'AER' : 
					   device.type === 'oxygen_pump' ? 'O2' :
					   device.type === 'water_pump' ? 'H2O' :
					   device.type === 'heater' ? 'HTR' : 'DEV'
	
	const deviceLabel = device.type === 'aerator' ? 'Aerator' : 
					   device.type === 'oxygen_pump' ? 'Oxygen Pump' :
					   device.type === 'water_pump' ? 'Water Pump' :
					   device.type === 'heater' ? 'Heater' : 'Device'
	
	const cardStyle = {
		...styles.deviceCard,
		...(device.status === 'running' ? styles.deviceCardRunning : {}),
		...(device.status === 'error' ? styles.deviceCardError : {}),
	}
	
	return (
		<div style={cardStyle}>
			{/* Status indicator */}
			<div style={{
				...styles.statusIndicator,
				background: getStatusColor(device.status),
				animation: device.status === 'running' ? 'pulse 2s infinite' : 'none',
			}} />
			
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
					<div style={{
						width: 36,
						height: 36,
						borderRadius: 8,
						background: device.status === 'running' 
							? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
							: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: '#fff',
						fontSize: '0.7rem',
						fontWeight: 700,
					}}>
						{deviceIcon}
					</div>
					<div>
						<div style={styles.deviceName}>{device.name}</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							<span style={styles.deviceTypeBadge}>{deviceLabel}</span>
							{device.is_manual_override && (
								<span style={{
									padding: '3px 8px',
									borderRadius: 4,
									fontSize: '0.65rem',
									fontWeight: 600,
									background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
									color: '#fff',
								}}>MANUAL</span>
							)}
						</div>
					</div>
				</div>
				
				<div style={styles.deviceMeta}>
					<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<circle cx="12" cy="12" r="10"/>
							<path d="M12 6v6l4 2"/>
						</svg>
						Pond {device.pond_id}
					</span>
					<span style={{
						display: 'flex',
						alignItems: 'center',
						gap: 4,
						color: device.online ? '#22c55e' : '#ef4444',
						fontWeight: 600,
					}}>
						<span style={{
							width: 6,
							height: 6,
							borderRadius: '50%',
							background: device.online ? '#22c55e' : '#ef4444',
						}}></span>
						{device.online ? 'Online' : 'Offline'}
					</span>
				</div>
				
				{device.status === 'running' && (
					<div style={styles.powerBar}>
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
							<span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Power Output</span>
							<span style={{ fontSize: '1rem', fontWeight: 700, color: '#22c55e' }}>{device.power_level}%</span>
						</div>
						<div style={styles.powerBarTrack}>
							<div style={{ ...styles.powerBarFill, width: `${device.power_level}%` }} />
						</div>
					</div>
				)}
				
				{device.last_triggered && (
					<div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<circle cx="12" cy="12" r="10"/>
							<path d="M12 6v6l4 2"/>
						</svg>
						Last triggered: {formatTimeAgo(device.last_triggered)}
					</div>
				)}
				
				<div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
					{device.status === 'running' ? (
						<button
							onClick={() => onStop(device.id)}
							style={{ ...styles.button, ...styles.buttonDanger, flex: 1 }}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<rect x="6" y="6" width="12" height="12" rx="2"/>
							</svg>
							Stop Device
						</button>
					) : (
						<button
							onClick={() => setShowOverrideModal(true)}
							style={{ ...styles.button, ...styles.buttonPrimary, flex: 1 }}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<polygon points="5 3 19 12 5 21 5 3"/>
							</svg>
							Manual Start
						</button>
					)}
				</div>
			</div>
			
			{/* Manual Override Modal */}
			{showOverrideModal && (
				<div style={{
					position: 'fixed',
					inset: 0,
					background: 'rgba(0, 0, 0, 0.6)',
					backdropFilter: 'blur(4px)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 50,
				}} onClick={() => setShowOverrideModal(false)}>
					<div style={{
						background: '#fff',
						borderRadius: 16,
						padding: 24,
						width: 400,
						maxWidth: '90vw',
						boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
					}} onClick={e => e.stopPropagation()}>
						<h3 style={{ margin: 0, marginBottom: 20, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
							Manual Override: {device.name}
						</h3>
						
						<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
							<div>
								<label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
									Power Level
								</label>
								<input
									type="range"
									min="10"
									max="100"
									value={overridePower}
									onChange={e => setOverridePower(Number(e.target.value))}
									style={{ width: '100%', accentColor: '#3b82f6' }}
								/>
								<div style={{ textAlign: 'right', fontSize: '1.25rem', fontWeight: 700, color: '#3b82f6' }}>{overridePower}%</div>
							</div>
							
							<div>
								<label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
									Duration
								</label>
								<div style={{ display: 'flex', gap: 8 }}>
									{[15, 30, 60, null].map(d => (
										<button
											key={d ?? 'indefinite'}
											onClick={() => setOverrideDuration(d)}
											style={{
												flex: 1,
												padding: '10px 12px',
												fontSize: '0.875rem',
												fontWeight: 600,
												borderRadius: 8,
												border: 'none',
												cursor: 'pointer',
												transition: 'all 0.2s ease',
												background: overrideDuration === d
													? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
													: '#f1f5f9',
												color: overrideDuration === d ? '#fff' : '#64748b',
											}}
										>
											{d ? `${d}m` : 'Always'}
										</button>
									))}
								</div>
							</div>
							
							<div>
								<label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
									Reason
								</label>
								<input
									type="text"
									value={overrideReason}
									onChange={e => setOverrideReason(e.target.value)}
									placeholder="Enter reason for manual override"
									style={{
										width: '100%',
										padding: '12px 16px',
										fontSize: '0.875rem',
										border: '2px solid #e2e8f0',
										borderRadius: 8,
										outline: 'none',
										transition: 'border-color 0.2s ease',
									}}
								/>
							</div>
						</div>
						
						<div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
							<button
								onClick={() => setShowOverrideModal(false)}
								style={{
									flex: 1,
									padding: '12px 20px',
									fontSize: '0.875rem',
									fontWeight: 600,
									borderRadius: 8,
									border: '2px solid #e2e8f0',
									background: '#fff',
									color: '#64748b',
									cursor: 'pointer',
								}}
							>
								Cancel
							</button>
							<button
								onClick={() => {
									onManualOverride(device.id, true, overridePower, overrideDuration, overrideReason || 'Manual activation')
									setShowOverrideModal(false)
								}}
								style={{ ...styles.button, ...styles.buttonPrimary, flex: 1, padding: '12px 20px' }}
							>
								Start Device
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

function ConfigCard({
	config,
	onToggle
}: {
	config: TriggerConfig
	onToggle: (id: string, enabled: boolean) => void
}) {
	const [expanded, setExpanded] = useState(false)
	const doThreshold = config.thresholds.find(t => t.parameter === 'DO')
	
	return (
		<div style={{
			padding: 16,
			borderRadius: 12,
			border: config.enabled ? '2px solid #22c55e' : '1px solid #e2e8f0',
			background: config.enabled 
				? 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, #fff 100%)'
				: '#fff',
			transition: 'all 0.2s ease',
		}}>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
					<div 
						style={{
							position: 'relative',
							width: 48,
							height: 24,
							borderRadius: 12,
							background: config.enabled 
								? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
								: '#e2e8f0',
							cursor: 'pointer',
							transition: 'all 0.3s ease',
						}}
						onClick={() => onToggle(config.id, !config.enabled)}
					>
						<div style={{
							position: 'absolute',
							width: 20,
							height: 20,
							background: '#fff',
							borderRadius: 10,
							top: 2,
							left: config.enabled ? 26 : 2,
							transition: 'all 0.3s ease',
							boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
						}} />
					</div>
					
					<div>
						<div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{config.name}</div>
						<div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
							<span style={{
								display: 'inline-flex',
								alignItems: 'center',
								padding: '2px 8px',
								borderRadius: 4,
								background: config.trigger_type === 'prediction' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
								color: config.trigger_type === 'prediction' ? '#8b5cf6' : '#3b82f6',
								fontWeight: 600,
							}}>
								{config.trigger_type === 'prediction' ? 'PREDICTION' : 'THRESHOLD'}
							</span>
							{config.trigger_type === 'prediction' && (
								<span>{config.prediction_hours_ahead}h ahead</span>
							)}
						</div>
					</div>
				</div>
				
				<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
					<span style={{
						padding: '4px 12px',
						fontSize: '0.7rem',
						fontWeight: 700,
						borderRadius: 6,
						textTransform: 'uppercase',
						letterSpacing: '0.05em',
						...getPriorityStyle(config.priority),
					}}>
						{config.priority}
					</span>
					<button
						onClick={() => setExpanded(!expanded)}
						style={{
							padding: '6px 12px',
							fontSize: '0.75rem',
							fontWeight: 600,
							borderRadius: 6,
							border: '1px solid #e2e8f0',
							background: '#fff',
							color: '#64748b',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							gap: 4,
						}}
					>
						{expanded ? 'Hide' : 'Details'}
						<svg 
							width="12" 
							height="12" 
							viewBox="0 0 24 24" 
							fill="none" 
							stroke="currentColor" 
							strokeWidth="2"
							style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}
						>
							<path d="M6 9l6 6 6-6"/>
						</svg>
					</button>
				</div>
			</div>
			
			{expanded && (
				<div style={{
					marginTop: 16,
					paddingTop: 16,
					borderTop: '1px solid #e2e8f0',
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
					gap: 12,
				}}>
					{doThreshold && (
						<>
							<div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
								<div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 4 }}>Min DO</div>
								<div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{doThreshold.min_value} mg/L</div>
							</div>
							<div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.05)', borderRadius: 8 }}>
								<div style={{ fontSize: '0.7rem', color: '#ef4444', marginBottom: 4 }}>Critical Level</div>
								<div style={{ fontSize: '1rem', fontWeight: 700, color: '#dc2626' }}>{doThreshold.critical_min} mg/L</div>
							</div>
						</>
					)}
					<div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
						<div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 4 }}>Cooldown</div>
						<div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{config.cooldown_seconds / 60} min</div>
					</div>
					<div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
						<div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 4 }}>Confirm Readings</div>
						<div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{config.confirmation_readings}</div>
					</div>
					<div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
						<div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 4 }}>Auto Shutoff</div>
						<div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{config.auto_shutoff_minutes} min</div>
					</div>
				</div>
			)}
		</div>
	)
}

function getPriorityStyle(priority: string) {
	switch (priority) {
		case 'critical': return { background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }
		case 'high': return { background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }
		case 'medium': return { background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }
		case 'low': return { background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' }
		default: return { background: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }
	}
}

function EventLogItem({
	event,
	onAcknowledge
}: {
	event: TriggerEvent
	onAcknowledge: (id: string) => void
}) {
	const isUnacknowledged = !event.user_acknowledged && event.action_taken === 'activated'
	
	return (
		<div style={{
			padding: 16,
			borderRadius: 10,
			border: isUnacknowledged ? '2px solid #f59e0b' : '1px solid #e2e8f0',
			background: isUnacknowledged 
				? 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, #fff 100%)'
				: '#fff',
			transition: 'all 0.2s ease',
		}}>
			<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
				<div style={{ flex: 1 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
						<span style={{
							padding: '4px 10px',
							fontSize: '0.7rem',
							fontWeight: 700,
							borderRadius: 6,
							textTransform: 'uppercase',
							letterSpacing: '0.05em',
							...getActionStyle(event.action_taken),
						}}>
							{event.action_taken}
						</span>
						<span style={{
							padding: '4px 10px',
							fontSize: '0.7rem',
							fontWeight: 700,
							borderRadius: 6,
							textTransform: 'uppercase',
							letterSpacing: '0.05em',
							...getPriorityStyle(event.priority),
						}}>
							{event.priority}
						</span>
						{event.was_prediction_based && (
							<span style={{
								padding: '4px 10px',
								fontSize: '0.7rem',
								fontWeight: 700,
								borderRadius: 6,
								background: 'rgba(139, 92, 246, 0.1)',
								color: '#8b5cf6',
								textTransform: 'uppercase',
								letterSpacing: '0.05em',
							}}>
								Predictive
							</span>
						)}
					</div>
					
					<div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
						Pond {event.pond_id} - {event.parameter}: {event.value?.toFixed(1)} mg/L
					</div>
					
					{event.blocked_reason && (
						<div style={{
							marginTop: 8,
							padding: '8px 12px',
							background: 'rgba(239, 68, 68, 0.05)',
							borderRadius: 6,
							fontSize: '0.8rem',
							color: '#dc2626',
							display: 'flex',
							alignItems: 'center',
							gap: 6,
						}}>
							<span style={{
								width: 16,
								height: 16,
								borderRadius: '50%',
								background: '#dc2626',
								color: '#fff',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								fontSize: '0.65rem',
								fontWeight: 700,
							}}>!</span>
							Blocked: {event.blocked_reason}
						</div>
					)}
					
					<div style={{
						marginTop: 8,
						fontSize: '0.75rem',
						color: '#94a3b8',
						display: 'flex',
						alignItems: 'center',
						gap: 12,
					}}>
						<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<circle cx="12" cy="12" r="10"/>
								<path d="M12 6v6l4 2"/>
							</svg>
							{formatTime(event.timestamp)}
						</span>
						<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<rect x="4" y="4" width="16" height="16" rx="2"/>
								<path d="M9 9h6M9 13h6M9 17h4"/>
							</svg>
							{event.devices_affected.length} device(s)
						</span>
					</div>
				</div>
				
				{isUnacknowledged && (
					<button
						onClick={() => onAcknowledge(event.id)}
						style={{
							padding: '8px 16px',
							fontSize: '0.8rem',
							fontWeight: 600,
							borderRadius: 8,
							border: 'none',
							background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
							color: '#fff',
							cursor: 'pointer',
							boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
							whiteSpace: 'nowrap',
						}}
					>
						Acknowledge
					</button>
				)}
			</div>
		</div>
	)
}

function getActionStyle(action: string) {
	switch (action) {
		case 'activated': return { background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' }
		case 'deactivated': return { background: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }
		case 'blocked': return { background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }
		case 'manual_override': return { background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }
		default: return { background: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }
	}
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function AutoTriggerPanel({
	systemEnabled,
	setSystemEnabled,
	devices,
	configs,
	events,
	manualOverrides: _manualOverrides,
	esp32Connected,
	lastCheck,
	onManualOverride,
	onToggleConfig,
	onStopDevice,
	onAcknowledgeEvent
}: AutoTriggerPanelProps) {
	const [activeTab, setActiveTab] = useState<'devices' | 'configs' | 'events'>('devices')
	
	// Group devices by pond
	const devicesByPond = devices.reduce((acc, device) => {
		const pondId = device.pond_id
		if (!acc[pondId]) acc[pondId] = []
		acc[pondId].push(device)
		return acc
	}, {} as Record<number, HardwareDevice[]>)
	
	const unacknowledgedCount = events.filter(e => !e.user_acknowledged && e.action_taken === 'activated').length
	const runningDevicesCount = devices.filter(d => d.status === 'running').length
	const enabledConfigsCount = configs.filter(c => c.enabled).length
	
	return (
		<div style={styles.panel}>
			<SystemHeader
				enabled={systemEnabled}
				onToggle={setSystemEnabled}
				esp32Status={esp32Connected}
				lastCheck={lastCheck}
			/>
			
			{/* Tab Navigation */}
			<div style={styles.tabBar}>
				<button
					onClick={() => setActiveTab('devices')}
					style={{
						...styles.tab,
						...(activeTab === 'devices' ? styles.tabActive : {}),
					}}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<rect x="4" y="4" width="16" height="16" rx="2"/>
						<path d="M9 9h6M9 13h6M9 17h4"/>
					</svg>
					Hardware Devices
					<span style={{
						...styles.tabBadge,
						background: runningDevicesCount > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.15)',
						color: runningDevicesCount > 0 ? '#16a34a' : '#64748b',
					}}>
						{runningDevicesCount}/{devices.length}
					</span>
					{activeTab === 'devices' && <div style={styles.tabIndicator} />}
				</button>
				<button
					onClick={() => setActiveTab('configs')}
					style={{
						...styles.tab,
						...(activeTab === 'configs' ? styles.tabActive : {}),
					}}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<circle cx="12" cy="12" r="3"/>
						<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
					</svg>
					Trigger Configs
					<span style={{
						...styles.tabBadge,
						background: 'rgba(59, 130, 246, 0.15)',
						color: '#3b82f6',
					}}>
						{enabledConfigsCount}/{configs.length}
					</span>
					{activeTab === 'configs' && <div style={styles.tabIndicator} />}
				</button>
				<button
					onClick={() => setActiveTab('events')}
					style={{
						...styles.tab,
						...(activeTab === 'events' ? styles.tabActive : {}),
					}}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M12 8v4l3 3"/>
						<circle cx="12" cy="12" r="10"/>
					</svg>
					Event Log
					{unacknowledgedCount > 0 && (
						<span style={{
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: 20,
							height: 20,
							borderRadius: 10,
							background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
							color: '#fff',
							fontSize: '0.7rem',
							fontWeight: 700,
							boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
						}}>
							{unacknowledgedCount}
						</span>
					)}
					{activeTab === 'events' && <div style={styles.tabIndicator} />}
				</button>
			</div>
			
			{/* Tab Content */}
			<div style={styles.content}>
				{activeTab === 'devices' && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
						{Object.entries(devicesByPond).map(([pondId, pondDevices]) => (
							<div key={pondId}>
								<h3 style={{
									margin: 0,
									marginBottom: 12,
									fontSize: '0.875rem',
									fontWeight: 600,
									color: '#64748b',
									display: 'flex',
									alignItems: 'center',
									gap: 8,
								}}>
									<span style={{
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										width: 24,
										height: 24,
										borderRadius: 6,
										background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
										color: '#fff',
										fontSize: '0.7rem',
										fontWeight: 700,
									}}>
										{pondId}
									</span>
									Pond {pondId}
								</h3>
								<div style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
									gap: 12,
								}}>
									{pondDevices.map(device => (
										<DeviceCard
											key={device.id}
											device={device}
											onManualOverride={onManualOverride}
											onStop={onStopDevice}
										/>
									))}
								</div>
							</div>
						))}
						
						{devices.length === 0 && (
							<div style={{
								textAlign: 'center',
								padding: 48,
								color: '#94a3b8',
							}}>
								<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
									<rect x="4" y="4" width="16" height="16" rx="2"/>
									<path d="M9 9h6M9 13h6M9 17h4"/>
								</svg>
								<div style={{ fontWeight: 500 }}>No devices connected</div>
								<div style={{ fontSize: '0.875rem', marginTop: 4 }}>Add water quality data to see devices</div>
							</div>
						)}
					</div>
				)}
				
				{activeTab === 'configs' && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
						{configs.map(config => (
							<ConfigCard
								key={config.id}
								config={config}
								onToggle={onToggleConfig}
							/>
						))}
						
						{configs.length === 0 && (
							<div style={{
								textAlign: 'center',
								padding: 48,
								color: '#94a3b8',
							}}>
								<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
									<circle cx="12" cy="12" r="3"/>
									<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
								</svg>
								<div style={{ fontWeight: 500 }}>No trigger configurations</div>
								<div style={{ fontSize: '0.875rem', marginTop: 4 }}>Configure triggers to automate device control</div>
							</div>
						)}
					</div>
				)}
				
				{activeTab === 'events' && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						{events.length > 0 ? (
							events.slice(0, 50).map(event => (
								<EventLogItem
									key={event.id}
									event={event}
									onAcknowledge={onAcknowledgeEvent}
								/>
							))
						) : (
							<div style={{
								textAlign: 'center',
								padding: 48,
								color: '#94a3b8',
							}}>
								<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
									<path d="M12 8v4l3 3"/>
									<circle cx="12" cy="12" r="10"/>
								</svg>
								<div style={{ fontWeight: 500 }}>No events recorded</div>
								<div style={{ fontSize: '0.875rem', marginTop: 4 }}>Trigger events will appear here</div>
							</div>
						)}
					</div>
				)}
			</div>
			
			{/* Footer Summary */}
			<div style={styles.footer}>
				<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
					<span style={{
						width: 8,
						height: 8,
						borderRadius: '50%',
						background: devices.filter(d => d.online).length === devices.length ? '#22c55e' : '#f59e0b',
					}}></span>
					{devices.filter(d => d.online).length}/{devices.length} devices online
				</span>
				<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
					</svg>
					{events.filter(e => e.action_taken === 'activated').length} total activations
				</span>
			</div>
		</div>
	)
}

export default AutoTriggerPanel
