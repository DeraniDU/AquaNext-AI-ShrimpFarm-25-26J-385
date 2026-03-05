import type { AlertPriority, WaterQualityStatus } from '../lib/types'

function clsForStatus(status: WaterQualityStatus): string {
	if (status === 'excellent' || status === 'good') return 'good'
	if (status === 'fair') return 'warn'
	return 'bad'
}

function clsForPriority(priority: AlertPriority): string {
	if (priority === 'info') return 'info'
	if (priority === 'warning') return 'warn'
	return 'bad'
}

export function WaterStatusBadge({ status }: { status: WaterQualityStatus }) {
	const cls = clsForStatus(status)
	return <span className={`badge ${cls}`}>{status.toUpperCase()}</span>
}

export function PriorityBadge({ priority }: { priority: AlertPriority }) {
	const cls = clsForPriority(priority)
	return <span className={`badge ${cls}`}>{priority.toUpperCase()}</span>
}









