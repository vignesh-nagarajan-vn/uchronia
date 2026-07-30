/**
 * The stylized world (v2/M22). Eleven macro-regions, matching the baseline's
 * own `ANCHOR_REGIONS` taxonomy exactly rather than inventing a second one,
 * drawn as deliberately coarse polygons on a 1000x520 field.
 *
 * This is NOT a map. It is a diagram with the shape of one: borders are
 * schematic, areas are not proportional, and no polygon here corresponds to
 * any real frontier at any date. Its whole job is to let a reader see which
 * macro-region a history is talking about, and the UI says so on the page.
 */

export interface MapRegion {
  /** Exactly a value of ANCHOR_REGIONS. */
  name: string
  /** Polygon points on the 1000x520 field. */
  points: string
  /** Where the label sits. */
  label: [number, number]
}

export const MAP_VIEWBOX = '0 0 1000 520'

export const MAP_REGIONS: readonly MapRegion[] = [
  {
    name: 'North America',
    points: '40,60 250,50 300,120 280,210 200,270 120,250 60,170',
    label: [170, 155],
  },
  {
    name: 'South America',
    points: '200,280 280,270 300,350 265,460 215,470 180,380',
    label: [242, 370],
  },
  {
    name: 'Europe',
    points: '430,60 560,55 585,120 545,165 465,170 420,120',
    label: [500, 115],
  },
  {
    name: 'Mediterranean',
    points: '420,175 545,170 560,215 490,245 425,225',
    label: [490, 208],
  },
  {
    name: 'Africa',
    points: '420,250 555,245 585,330 540,450 455,455 405,350',
    label: [493, 350],
  },
  {
    name: 'Middle East',
    points: '565,175 665,165 690,225 640,275 580,265 555,215',
    label: [620, 220],
  },
  {
    name: 'South Asia',
    points: '695,230 775,220 800,290 745,355 700,300',
    label: [745, 280],
  },
  {
    name: 'East Asia',
    points: '700,90 855,80 890,160 845,235 780,215 690,160',
    label: [790, 155],
  },
  {
    name: 'Southeast Asia',
    points: '805,245 890,250 905,315 845,350 795,315',
    label: [850, 295],
  },
  {
    name: 'Oceania',
    points: '840,375 950,370 965,450 890,475 835,435',
    label: [898, 422],
  },
  {
    // Not a place: the residual, for events whose reach is genuinely global.
    name: 'the wider world',
    points: '40,480 960,480 960,510 40,510',
    label: [500, 499],
  },
]

/** A stable colour for a holder's name, so a polity keeps its tint across eras. */
export function holderTint(holder: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < holder.length; i++) {
    h ^= holder.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  // Muted, paper-friendly hues only: the map must not shout over the ledger.
  const hue = h % 360
  return `hsl(${hue} 32% 62%)`
}

/** Grip decides opacity: contested ground reads as unsettled, and should. */
export const GRIP_OPACITY: Record<string, number> = {
  contested: 0.3,
  held: 0.55,
  consolidated: 0.8,
}
