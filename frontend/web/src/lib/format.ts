export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
	return new Intl.NumberFormat(undefined, {
		maximumFractionDigits: 2,
		...options
	}).format(value)
}

export function formatPercent01(value: number) {
	const v = Number.isFinite(value) ? value : 0
	return `${formatNumber(v * 100, { maximumFractionDigits: 0 })}%`
}

export function formatDateTime(iso: string | null | undefined) {
	if (!iso) return '—'
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return iso
	return d.toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	})
}









