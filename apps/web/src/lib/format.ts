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

/** Cost-meter dollars: enough precision that a cheap run visibly moves. */
export function formatUsd(usd: number): string {
  if (usd >= 1) return `$${usd.toFixed(2)}`
  if (usd >= 0.01) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(4)}`
}

/**
 * How far a convergence landed from the attested schedule (v2/M18). Zero is
 * the interesting case for the opposite reason, so it gets its own words.
 */
export function describeLateness(years: number): string {
  if (years === 0) return 'on schedule'
  const n = Math.abs(years)
  return `${n} ${n === 1 ? 'year' : 'years'} ${years > 0 ? 'late' : 'early'}`
}
