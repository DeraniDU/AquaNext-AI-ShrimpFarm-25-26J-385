import { useState, useEffect, useCallback, useRef } from 'react'
import type {
	WaterQualityData,
	HardwareDevice,
	TriggerConfig,
	TriggerEvent,
	TriggerDecision,
	SafetyCheck,
	AutoTriggerSystemStatus,
	ManualOverride,
	TriggerPriority,
	HardwareStatus
} from './types'

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_THRESHOLDS = {
	DO: { min: 5.0, max: 12.0, critical_min: 3.5, critical_max: 15.0, unit: 'mg/L' },
	pH: { min: 7.5, max: 8.5, critical_min: 6.5, critical_max: 9.5, unit: '' },
	Temperature: { min: 26, max: 30, critical_min: 22, critical_max: 34, unit: '°C' },
	Salinity: { min: 15, max: 25, critical_min: 10, critical_max: 35, unit: 'ppt' },
	Ammonia: { min: 0, max: 0.1, critical_min: 0, critical_max: 0.5, unit: 'mg/L' }
}

const CHECK_INTERVAL = 10000 // 10 seconds
const CONFIRMATION_READINGS = 3
const COOLDOWN_SECONDS = 300 // 5 minutes
const MAX_EVENTS_STORED = 100

// ============================================================
// SIMULATED ESP32 DEVICES
// ============================================================

function generateSimulatedDevices(pondIds: number[]): HardwareDevice[] {
	const devices: HardwareDevice[] = []
	
	pondIds.forEach(pondId => {
		// Each pond has 2 aerators and 1 oxygen pump
		devices.push({
			id: `aerator-${pondId}-1`,
			type: 'aerator',
			name: `Aerator ${pondId}-A`,
			pond_id: pondId,
			status: 'standby',
			power_level: 0,
			is_manual_override: false,
			last_triggered: null,
			esp32_ip: `192.168.1.${100 + pondId * 3}`,
			firmware_version: '2.1.0',
			online: true
		})
		devices.push({
			id: `aerator-${pondId}-2`,
			type: 'aerator',
			name: `Aerator ${pondId}-B`,
			pond_id: pondId,
			status: 'standby',
			power_level: 0,
			is_manual_override: false,
			last_triggered: null,
			esp32_ip: `192.168.1.${101 + pondId * 3}`,
			firmware_version: '2.1.0',
			online: true
		})
		devices.push({
			id: `oxygen-pump-${pondId}`,
			type: 'oxygen_pump',
			name: `O2 Pump ${pondId}`,
			pond_id: pondId,
			status: 'standby',
			power_level: 0,
			is_manual_override: false,
			last_triggered: null,
			esp32_ip: `192.168.1.${102 + pondId * 3}`,
			firmware_version: '2.0.5',
			online: true
		})
	})
	
	return devices
}

function generateDefaultConfigs(pondIds: number[]): TriggerConfig[] {
	const configs: TriggerConfig[] = []
	
	// Global low DO threshold trigger
	configs.push({
		id: 'config-do-low-all',
		name: 'Low DO Emergency (All Ponds)',
		enabled: true,
		pond_id: 'all',
		trigger_type: 'threshold',
		thresholds: [{
			parameter: 'DO',
			min_value: DEFAULT_THRESHOLDS.DO.min,
			max_value: DEFAULT_THRESHOLDS.DO.max,
			critical_min: DEFAULT_THRESHOLDS.DO.critical_min,
			critical_max: DEFAULT_THRESHOLDS.DO.critical_max,
			unit: 'mg/L'
		}],
		target_devices: [], // Will target all aerators
		prediction_hours_ahead: 0,
		cooldown_seconds: COOLDOWN_SECONDS,
		confirmation_readings: CONFIRMATION_READINGS,
		auto_shutoff_minutes: 30,
		priority: 'critical'
	})
	
	// Prediction-based DO trigger
	configs.push({
		id: 'config-do-prediction',
		name: 'Predicted Low DO (6h ahead)',
		enabled: true,
		pond_id: 'all',
		trigger_type: 'prediction',
		thresholds: [{
			parameter: 'DO',
			min_value: 5.5,
			max_value: 12.0,
			critical_min: 4.5,
			critical_max: 15.0,
			unit: 'mg/L'
		}],
		target_devices: [],
		prediction_hours_ahead: 6,
		cooldown_seconds: 600, // 10 minutes
		confirmation_readings: 2,
		auto_shutoff_minutes: 60,
		priority: 'high'
	})
	
	// Per-pond configs
	pondIds.forEach(pondId => {
		configs.push({
			id: `config-do-pond-${pondId}`,
			name: `Pond ${pondId} DO Monitor`,
			enabled: true,
			pond_id: pondId,
			trigger_type: 'threshold',
			thresholds: [{
				parameter: 'DO',
				min_value: DEFAULT_THRESHOLDS.DO.min,
				max_value: DEFAULT_THRESHOLDS.DO.max,
				critical_min: DEFAULT_THRESHOLDS.DO.critical_min,
				critical_max: DEFAULT_THRESHOLDS.DO.critical_max,
				unit: 'mg/L'
			}],
			target_devices: [`aerator-${pondId}-1`, `aerator-${pondId}-2`, `oxygen-pump-${pondId}`],
			prediction_hours_ahead: 0,
			cooldown_seconds: COOLDOWN_SECONDS,
			confirmation_readings: CONFIRMATION_READINGS,
			auto_shutoff_minutes: 30,
			priority: 'high'
		})
	})
	
	return configs
}

// ============================================================
// TRIGGER LOGIC
// ============================================================

function runSafetyChecks(
	waterData: WaterQualityData,
	device: HardwareDevice,
	config: TriggerConfig,
	recentEvents: TriggerEvent[],
	confirmationBuffer: Map<string, number[]>
): SafetyCheck[] {
	const checks: SafetyCheck[] = []
	const now = Date.now()
	
	// 1. Sensor Validation - check for impossible values
	const sensorCheck: SafetyCheck = {
		name: 'Sensor Validation',
		passed: true,
		message: 'Sensor readings are within valid range',
		check_type: 'sensor_validation'
	}
	
	if (waterData.dissolved_oxygen < 0 || waterData.dissolved_oxygen > 20) {
		sensorCheck.passed = false
		sensorCheck.message = `Invalid DO reading: ${waterData.dissolved_oxygen} mg/L`
	}
	if (waterData.ph < 0 || waterData.ph > 14) {
		sensorCheck.passed = false
		sensorCheck.message = `Invalid pH reading: ${waterData.ph}`
	}
	checks.push(sensorCheck)
	
	// 2. Rate Limit - cooldown check
	const lastTrigger = recentEvents
		.filter(e => e.trigger_config_id === config.id && e.action_taken === 'activated')
		.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
	
	const cooldownCheck: SafetyCheck = {
		name: 'Cooldown Period',
		passed: true,
		message: 'Cooldown period has passed',
		check_type: 'rate_limit'
	}
	
	if (lastTrigger) {
		const lastTime = new Date(lastTrigger.timestamp).getTime()
		const elapsed = (now - lastTime) / 1000
		if (elapsed < config.cooldown_seconds) {
			cooldownCheck.passed = false
			cooldownCheck.message = `Cooldown active: ${Math.ceil(config.cooldown_seconds - elapsed)}s remaining`
		}
	}
	checks.push(cooldownCheck)
	
	// 3. Device Health
	const deviceCheck: SafetyCheck = {
		name: 'Device Health',
		passed: device.online && device.status !== 'error' && device.status !== 'maintenance',
		message: device.online ? 'Device is online and healthy' : 'Device is offline or in error state',
		check_type: 'device_health'
	}
	checks.push(deviceCheck)
	
	// 4. Confirmation Readings - require multiple readings before triggering
	const bufferKey = `${config.id}-${waterData.pond_id}`
	const readings = confirmationBuffer.get(bufferKey) || []
	
	const confirmCheck: SafetyCheck = {
		name: 'Reading Confirmation',
		passed: readings.length >= config.confirmation_readings,
		message: readings.length >= config.confirmation_readings
			? `Confirmed with ${readings.length} consecutive readings`
			: `Awaiting confirmation: ${readings.length}/${config.confirmation_readings} readings`,
		check_type: 'confirmation'
	}
	checks.push(confirmCheck)
	
	// 5. Time-based check - avoid triggering during known maintenance windows
	const hour = new Date().getHours()
	const timeCheck: SafetyCheck = {
		name: 'Time Validation',
		passed: true,
		message: 'No maintenance window active',
		check_type: 'time_based'
	}
	// Example: maintenance window 2-4 AM (but allow critical triggers)
	if (hour >= 2 && hour < 4 && config.priority !== 'critical') {
		timeCheck.passed = false
		timeCheck.message = 'Maintenance window active (2:00-4:00 AM)'
	}
	checks.push(timeCheck)
	
	return checks
}

function evaluateTriggerCondition(
	waterData: WaterQualityData,
	config: TriggerConfig,
	predictedDO6h?: number
): { shouldTrigger: boolean; parameter: string; value: number; threshold: number; reason: string } {
	// Check DO threshold
	const doThreshold = config.thresholds.find(t => t.parameter === 'DO')
	
	if (doThreshold) {
		// Current value check
		if (config.trigger_type === 'threshold') {
			if (waterData.dissolved_oxygen < doThreshold.critical_min) {
				return {
					shouldTrigger: true,
					parameter: 'DO',
					value: waterData.dissolved_oxygen,
					threshold: doThreshold.critical_min,
					reason: `CRITICAL: DO at ${waterData.dissolved_oxygen.toFixed(1)} mg/L (below ${doThreshold.critical_min} mg/L)`
				}
			}
			if (waterData.dissolved_oxygen < doThreshold.min_value) {
				return {
					shouldTrigger: true,
					parameter: 'DO',
					value: waterData.dissolved_oxygen,
					threshold: doThreshold.min_value,
					reason: `WARNING: DO at ${waterData.dissolved_oxygen.toFixed(1)} mg/L (below ${doThreshold.min_value} mg/L)`
				}
			}
		}
		
		// Prediction-based check
		if (config.trigger_type === 'prediction' && predictedDO6h !== undefined) {
			if (predictedDO6h < doThreshold.critical_min) {
				return {
					shouldTrigger: true,
					parameter: 'DO',
					value: predictedDO6h,
					threshold: doThreshold.critical_min,
					reason: `PREDICTED: DO will drop to ${predictedDO6h.toFixed(1)} mg/L in 6 hours`
				}
			}
			if (predictedDO6h < doThreshold.min_value) {
				return {
					shouldTrigger: true,
					parameter: 'DO',
					value: predictedDO6h,
					threshold: doThreshold.min_value,
					reason: `PREDICTED: DO may drop to ${predictedDO6h.toFixed(1)} mg/L in 6 hours`
				}
			}
		}
	}
	
	return {
		shouldTrigger: false,
		parameter: '',
		value: 0,
		threshold: 0,
		reason: 'All parameters within safe range'
	}
}

function calculatePowerLevel(
	value: number,
	threshold: number,
	criticalThreshold: number,
	priority: TriggerPriority
): number {
	// Calculate power level based on severity
	const deviation = threshold - value
	const criticalDeviation = threshold - criticalThreshold
	
	if (value <= criticalThreshold) {
		return 100 // Full power for critical
	}
	
	// Scale between 50-90% based on deviation
	const ratio = Math.min(deviation / criticalDeviation, 1)
	const basePower = priority === 'critical' ? 70 : priority === 'high' ? 60 : 50
	return Math.round(basePower + ratio * 30)
}

// ============================================================
// MAIN HOOK
// ============================================================

export function useAutoTrigger(waterQuality: WaterQualityData[], predictedDO?: Record<number, number>) {
	const [systemEnabled, setSystemEnabled] = useState(true)
	const [devices, setDevices] = useState<HardwareDevice[]>([])
	const [configs, setConfigs] = useState<TriggerConfig[]>([])
	const [events, setEvents] = useState<TriggerEvent[]>([])
	const [manualOverrides, setManualOverrides] = useState<ManualOverride[]>([])
	const [pendingDecisions, setPendingDecisions] = useState<TriggerDecision[]>([])
	const [esp32Connected] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected')
	const [lastCheck, setLastCheck] = useState<string>(new Date().toISOString())
	
	// Confirmation buffer for multi-reading confirmation
	const confirmationBuffer = useRef<Map<string, number[]>>(new Map())
	
	// Initialize devices and configs
	useEffect(() => {
		const pondIds = [...new Set(waterQuality.map(w => w.pond_id))]
		if (pondIds.length > 0 && devices.length === 0) {
			setDevices(generateSimulatedDevices(pondIds))
			setConfigs(generateDefaultConfigs(pondIds))
		}
	}, [waterQuality, devices.length])
	
	// Main monitoring loop
	useEffect(() => {
		if (!systemEnabled || waterQuality.length === 0) return
		
		const checkTriggers = () => {
			const now = new Date()
			setLastCheck(now.toISOString())
			
			const newDecisions: TriggerDecision[] = []
			const newEvents: TriggerEvent[] = []
			
			// Check each pond
			waterQuality.forEach(water => {
				// Find applicable configs for this pond
				const applicableConfigs = configs.filter(c => 
					c.enabled && (c.pond_id === 'all' || c.pond_id === water.pond_id)
				)
				
				applicableConfigs.forEach(config => {
					// Get predicted DO if available
					const predicted = predictedDO?.[water.pond_id]
					
					// Evaluate trigger condition
					const condition = evaluateTriggerCondition(water, config, predicted)
					
					if (condition.shouldTrigger) {
						// Update confirmation buffer
						const bufferKey = `${config.id}-${water.pond_id}`
						const readings = confirmationBuffer.current.get(bufferKey) || []
						readings.push(condition.value)
						if (readings.length > config.confirmation_readings) {
							readings.shift()
						}
						confirmationBuffer.current.set(bufferKey, readings)
						
						// Get target devices
						let targetDevices = config.target_devices.length > 0
							? devices.filter(d => config.target_devices.includes(d.id))
							: devices.filter(d => d.pond_id === water.pond_id && (d.type === 'aerator' || d.type === 'oxygen_pump'))
						
						// Filter out devices with manual override
						targetDevices = targetDevices.filter(d => {
							const override = manualOverrides.find(o => o.device_id === d.id && o.enabled)
							return !override
						})
						
						// Only proceed if there are target devices
						if (targetDevices.length > 0) {
							// Run safety checks
							const allChecks = targetDevices.flatMap(device => 
								runSafetyChecks(water, device, config, events, confirmationBuffer.current)
							)
							
							const allPassed = allChecks.every(c => c.passed)
							const blockedReasons = allChecks.filter(c => !c.passed).map(c => c.message)
							
							// Calculate power level
							const doThreshold = config.thresholds.find(t => t.parameter === 'DO')
							const powerLevel = doThreshold
								? calculatePowerLevel(condition.value, doThreshold.min_value, doThreshold.critical_min, config.priority)
								: 70
							
							const decision: TriggerDecision = {
								should_trigger: allPassed,
								trigger_type: config.trigger_type,
								priority: config.priority,
								devices_to_activate: targetDevices.map(d => d.id),
								power_level: powerLevel,
								safety_checks: allChecks,
								all_checks_passed: allPassed,
								blocked_reason: blockedReasons.length > 0 ? blockedReasons.join('; ') : undefined,
								reasoning: condition.reason
							}
							
							newDecisions.push(decision)
							
							// Create event if triggered or blocked
							if (allPassed || blockedReasons.length > 0) {
								const event: TriggerEvent = {
									id: `evt-${Date.now()}-${water.pond_id}-${config.id}`,
									timestamp: now.toISOString(),
									trigger_config_id: config.id,
									trigger_type: config.trigger_type,
									pond_id: water.pond_id,
									parameter: condition.parameter,
									value: condition.value,
									threshold: condition.threshold,
									action_taken: allPassed ? 'activated' : 'blocked',
									devices_affected: targetDevices.map(d => d.id),
									priority: config.priority,
									was_prediction_based: config.trigger_type === 'prediction',
									prediction_horizon: config.trigger_type === 'prediction' ? `${config.prediction_hours_ahead}h` : undefined,
									confirmed: allPassed,
									blocked_reason: blockedReasons.length > 0 ? blockedReasons.join('; ') : undefined,
									user_acknowledged: false
								}
								newEvents.push(event)
							}
							
							// Update device status if triggered
							if (allPassed) {
								setDevices(prev => prev.map(d => {
									if (targetDevices.some(td => td.id === d.id)) {
										return {
											...d,
											status: 'running' as HardwareStatus,
											power_level: powerLevel,
											last_triggered: now.toISOString()
										}
									}
									return d
								}))
							}
						} // end if (targetDevices.length > 0)
					} else {
						// Clear confirmation buffer if condition not met
						const bufferKey = `${config.id}-${water.pond_id}`
						confirmationBuffer.current.delete(bufferKey)
					}
				})
			})
			
			if (newDecisions.length > 0) {
				setPendingDecisions(newDecisions)
			}
			
			if (newEvents.length > 0) {
				setEvents(prev => [...newEvents, ...prev].slice(0, MAX_EVENTS_STORED))
			}
		}
		
		// Initial check
		checkTriggers()
		
		// Set up interval
		const interval = setInterval(checkTriggers, CHECK_INTERVAL)
		
		return () => clearInterval(interval)
	}, [systemEnabled, waterQuality, predictedDO, configs, devices, events, manualOverrides])
	
	// Manual override function
	const setManualOverride = useCallback((
		deviceId: string,
		enabled: boolean,
		powerLevel: number,
		durationMinutes: number | null,
		reason: string
	) => {
		const now = new Date()
		const override: ManualOverride = {
			device_id: deviceId,
			enabled,
			power_level: powerLevel,
			started_at: now.toISOString(),
			expires_at: durationMinutes ? new Date(now.getTime() + durationMinutes * 60000).toISOString() : null,
			reason,
			user_id: 'farmer-1'
		}
		
		setManualOverrides(prev => {
			const filtered = prev.filter(o => o.device_id !== deviceId)
			return enabled ? [...filtered, override] : filtered
		})
		
		// Update device status
		setDevices(prev => prev.map(d => {
			if (d.id === deviceId) {
				return {
					...d,
					is_manual_override: enabled,
					status: enabled ? (powerLevel > 0 ? 'running' : 'standby') as HardwareStatus : 'standby',
					power_level: enabled ? powerLevel : 0
				}
			}
			return d
		}))
		
		// Log event
		const device = devices.find(d => d.id === deviceId)
		if (device) {
			const event: TriggerEvent = {
				id: `evt-manual-${Date.now()}`,
				timestamp: now.toISOString(),
				trigger_config_id: 'manual',
				trigger_type: 'manual',
				pond_id: device.pond_id,
				parameter: 'Manual Override',
				value: powerLevel,
				threshold: 0,
				action_taken: 'manual_override',
				devices_affected: [deviceId],
				priority: 'medium',
				was_prediction_based: false,
				confirmed: true,
				user_acknowledged: true,
				notes: reason
			}
			setEvents(prev => [event, ...prev].slice(0, MAX_EVENTS_STORED))
		}
	}, [devices])
	
	// Toggle config
	const toggleConfig = useCallback((configId: string, enabled: boolean) => {
		setConfigs(prev => prev.map(c => c.id === configId ? { ...c, enabled } : c))
	}, [])
	
	// Update threshold
	const updateThreshold = useCallback((configId: string, parameter: string, field: 'min_value' | 'critical_min', value: number) => {
		setConfigs(prev => prev.map(c => {
			if (c.id === configId) {
				return {
					...c,
					thresholds: c.thresholds.map(t => t.parameter === parameter ? { ...t, [field]: value } : t)
				}
			}
			return c
		}))
	}, [])
	
	// Acknowledge event
	const acknowledgeEvent = useCallback((eventId: string) => {
		setEvents(prev => prev.map(e => e.id === eventId ? { ...e, user_acknowledged: true } : e))
	}, [])
	
	// Stop device
	const stopDevice = useCallback((deviceId: string) => {
		setDevices(prev => prev.map(d => {
			if (d.id === deviceId) {
				return { ...d, status: 'standby' as HardwareStatus, power_level: 0 }
			}
			return d
		}))
		
		// Clear manual override if exists
		setManualOverrides(prev => prev.filter(o => o.device_id !== deviceId))
	}, [])
	
	// Get system status
	const getSystemStatus = useCallback((): AutoTriggerSystemStatus => {
		const nextCheck = new Date(new Date(lastCheck).getTime() + CHECK_INTERVAL)
		return {
			enabled: systemEnabled,
			last_check: lastCheck,
			next_check: nextCheck.toISOString(),
			check_interval_seconds: CHECK_INTERVAL / 1000,
			active_triggers: events.filter(e => e.action_taken === 'activated' && !e.user_acknowledged),
			pending_triggers: pendingDecisions,
			devices,
			configs,
			recent_events: events.slice(0, 20),
			system_health: esp32Connected === 'connected' ? 'healthy' : esp32Connected === 'reconnecting' ? 'warning' : 'error',
			esp32_connection: esp32Connected
		}
	}, [systemEnabled, lastCheck, events, pendingDecisions, devices, configs, esp32Connected])
	
	return {
		systemEnabled,
		setSystemEnabled,
		devices,
		configs,
		events,
		manualOverrides,
		pendingDecisions,
		esp32Connected,
		setManualOverride,
		toggleConfig,
		updateThreshold,
		acknowledgeEvent,
		stopDevice,
		getSystemStatus,
		lastCheck
	}
}
