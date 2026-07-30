export interface EraSpan {
  startYear: number
  endYear: number
}

/** Fibonacci-flavored widening: disciplined near the POD, roomy decades out (P2). */
const WIDTHS = [2, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const

/** The epilogue's reach past the horizon (v2/M18). One era, openly a guess. */
export const EPILOGUE_YEARS = 50

/**
 * How far past a POD a history runs when the composer does not say (v2/M18).
 * Deep time is the default: a divergence in 1453 should reach the present,
 * not stop politely in 1600. Floored so a POD inside living memory still gets
 * enough road to derive anything at all.
 */
export function defaultHorizonYears(podYear: number, currentYear: number): number {
  return Math.min(6000, Math.max(60, currentYear - podYear))
}

/**
 * The fixed era plan for a branch: spans covering (fromYear → toYear], the
 * first a tight seed window, each later era wider than the last. A branch's
 * own era ordinals index straight into its plan, which is what makes
 * interrupted runs resumable - generation continues at plan[ownEras.length].
 *
 * Past the width table the spans keep growing rather than repeating, so a
 * five-thousand-year history costs a bounded number of eras (v2/M18): deep
 * time gets coarser the further it runs, which is also how it reads.
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
  let width = WIDTHS[WIDTHS.length - 1] as number
  let previous = WIDTHS[WIDTHS.length - 2] as number
  while (cursor < toYear) {
    const endYear = Math.min(cursor + width, toYear)
    spans.push({ startYear: cursor, endYear })
    cursor = endYear
    ;[previous, width] = [width, previous + width]
  }
  return spans
}

/** How many events an era asks for: grows with distance from the POD (P2). */
export function eraBatchSize(distanceYears: number): number {
  return 4 + Math.min(3, Math.floor(distanceYears / 40))
}
