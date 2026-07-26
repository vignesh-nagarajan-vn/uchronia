import { type BaselineAnchor, BaselineDataset } from '@uchronia/schemas'
import rawDataset from '../data/baseline.json' with { type: 'json' }

let cached: BaselineDataset | null = null

/** The curated real-history spine (F7) - parsed once, validated always. */
export function loadBaseline(): BaselineDataset {
  if (!cached) cached = BaselineDataset.parse(rawDataset)
  return cached
}

/**
 * Which regions count as neighbors when ranking anchors for a POD's theatre.
 * Keys and values use the exact region names of the baseline dataset.
 */
const ADJACENT_REGIONS: Record<string, readonly string[]> = {
  Mediterranean: ['Europe', 'Middle East', 'Africa'],
  Europe: ['Mediterranean', 'Middle East', 'North America'],
  'Middle East': ['Mediterranean', 'Europe', 'Africa', 'South Asia'],
  Africa: ['Mediterranean', 'Middle East'],
  'East Asia': ['Southeast Asia', 'South Asia'],
  'Southeast Asia': ['East Asia', 'South Asia', 'Oceania'],
  'South Asia': ['Middle East', 'East Asia', 'Southeast Asia'],
  'North America': ['South America', 'Europe'],
  'South America': ['North America'],
  Oceania: ['Southeast Asia'],
}

const GLOBAL_REGION = 'the wider world'

// The pod's region is model-written free text; match it caselessly.
const ADJACENT_LOWER: ReadonlyMap<string, readonly string[]> = new Map(
  Object.entries(ADJACENT_REGIONS).map(([region, neighbors]) => [
    region.toLowerCase(),
    neighbors.map((n) => n.toLowerCase()),
  ]),
)

/**
 * Rank an anchor for a given POD region: 0 = same theatre (or either side is
 * global), 1 = adjacent theatre, 2 = elsewhere. Convergence is about the same
 * pressure discharging into the same channel - a Ming fleet is not an
 * attractor for an Alexandrian divergence, however close its year.
 */
function regionRank(anchorRegion: string, podRegion: string): number {
  const anchor = anchorRegion.toLowerCase()
  const pod = podRegion.toLowerCase()
  if (pod === GLOBAL_REGION || anchor === GLOBAL_REGION) return 0
  if (anchor === pod) return 0
  return (ADJACENT_LOWER.get(pod) ?? []).includes(anchor) ? 1 : 2
}

/**
 * Anchors within ±window years of a given year. When a `region` is given,
 * same-theatre anchors rank first, adjacent theatres second, the rest last -
 * year proximity breaks ties within each tier, so off-region anchors still
 * fill the tail where the record is sparse rather than crowding out the
 * relevant ones. `limit` caps the result after ranking.
 */
export function anchorsNear(
  year: number,
  windowYears: number,
  opts: { region?: string; limit?: number } = {},
): BaselineAnchor[] {
  const { region, limit } = opts
  const ranked = loadBaseline()
    .anchors.filter((a) => Math.abs(a.year - year) <= windowYears)
    .sort((a, b) => {
      if (region !== undefined) {
        const tier = regionRank(a.region, region) - regionRank(b.region, region)
        if (tier !== 0) return tier
      }
      return Math.abs(a.year - year) - Math.abs(b.year - year)
    })
  return limit === undefined ? ranked : ranked.slice(0, limit)
}
