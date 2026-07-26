/**
 * Year formatting for the ledger. Uchronia spans antiquity to the present, so
 * negative years render as BC and positive years bare, matching how the
 * baseline dataset and generated events record dates.
 */
export function formatYear(year: number): string {
  if (!Number.isFinite(year)) return '–'
  const y = Math.trunc(year)
  if (y < 0) return `${Math.abs(y)} BC`
  if (y === 0) return '1 BC' // there is no year zero in the historical calendar
  return String(y)
}

/** Range label for era headers, e.g. "48 BC – 12" or "1453 – 1500". */
export function formatYearRange(start: number, end: number): string {
  return `${formatYear(start)} – ${formatYear(end)}`
}
