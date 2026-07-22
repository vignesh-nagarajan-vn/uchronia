import { type BaselineAnchor, BaselineDataset } from '@uchronia/schemas'
import rawDataset from '../data/baseline.json' with { type: 'json' }

let cached: BaselineDataset | null = null

/** The curated real-history spine (F7) — parsed once, validated always. */
export function loadBaseline(): BaselineDataset {
  if (!cached) cached = BaselineDataset.parse(rawDataset)
  return cached
}

/** Anchors within ±window years of a given year, nearest first. */
export function anchorsNear(year: number, windowYears: number): BaselineAnchor[] {
  return loadBaseline()
    .anchors.filter((a) => Math.abs(a.year - year) <= windowYears)
    .sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year))
}
