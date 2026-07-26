export interface EraSpan {
  startYear: number
  endYear: number
}

/** Fibonacci-flavored widening: disciplined near the POD, roomy decades out (P2). */
const WIDTHS = [2, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const

/**
 * The fixed era plan for a branch: spans covering (fromYear → toYear], the
 * first a tight seed window, each later era wider than the last. A branch's
 * own era ordinals index straight into its plan, which is what makes
 * interrupted runs resumable - generation continues at plan[ownEras.length].
 */
export function planEraSpans(fromYear: number, toYear: number): EraSpan[] {
  if (toYear <= fromYear) return []
  const spans: EraSpan[] = []
  let cursor = fromYear
  for (const width of WIDTHS) {
    if (cursor >= toYear) return spans
    const endYear = Math.min(cursor + width, toYear)
    spans.push({ startYear: cursor, endYear })
    cursor = endYear
  }
  const last = WIDTHS[WIDTHS.length - 1] as number
  while (cursor < toYear) {
    const endYear = Math.min(cursor + last, toYear)
    spans.push({ startYear: cursor, endYear })
    cursor = endYear
  }
  return spans
}

/** How many events an era asks for: grows with distance from the POD (P2). */
export function eraBatchSize(distanceYears: number): number {
  return 4 + Math.min(3, Math.floor(distanceYears / 40))
}
