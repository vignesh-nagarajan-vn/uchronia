import { z } from 'zod'
import { UlidString } from './ids.js'
import { Lens } from './lens.js'
import { Provenance } from './provenance.js'

/** The fixed region taxonomy of the baseline (v2/M16; the M22 map reuses it). */
export const ANCHOR_REGIONS = [
  'Mediterranean',
  'Europe',
  'Middle East',
  'Africa',
  'East Asia',
  'South Asia',
  'Southeast Asia',
  'North America',
  'South America',
  'Oceania',
  'the wider world',
] as const
export const AnchorRegion = z.enum(ANCHOR_REGIONS)
export type AnchorRegion = z.infer<typeof AnchorRegion>

/**
 * A curated real-history anchor event. 1500+ of these form the baseline spine
 * (packages/core/data/baseline.json) - the blue line the divergence peels away
 * from, and the reference set for retrieval and convergence detection. Always
 * curated, never generated. v2 (M16) adds themes, multi-region reach,
 * magnitude, and attractor strength.
 */
export const BaselineAnchor = z.object({
  id: z.string().min(1),
  year: z.number().int(),
  title: z.string().min(1),
  summary: z.string().min(1),
  /** Primary theatre (kept singular for v1 compatibility and ranking). */
  region: z.string().min(1),
  /** Every theatre the event genuinely reaches; the primary comes first. */
  regions: z.array(AnchorRegion).min(1),
  lenses: z.array(Lens).min(1),
  /** Themes for retrieval and the curation view ("war", "plague", "trade"). */
  tags: z.array(z.string().min(1)).min(1).max(6),
  /** 1 notable/local … 5 civilizational. */
  magnitude: z.number().int().min(1).max(5),
  /** 0-1: how strongly convergent histories still pull back toward this. */
  attractorStrength: z.number().min(0).max(1),
})
export type BaselineAnchor = z.infer<typeof BaselineAnchor>

export const BaselineDataset = z.object({
  version: z.number().int(),
  provenance: z.literal('curated'),
  note: z.string().optional(),
  anchors: z.array(BaselineAnchor),
})
export type BaselineDataset = z.infer<typeof BaselineDataset>

/**
 * A moment where the divergent timeline rhymes back into real history - the
 * most satisfying thing this tool can show, so it is a first-class record.
 */
export const CONVERGENCE_ATTRACTORS = [
  'demographic',
  'geographic',
  'technological',
  'economic',
  'cultural',
  'institutional',
] as const
export const ConvergenceAttractor = z.enum(CONVERGENCE_ATTRACTORS)
export type ConvergenceAttractor = z.infer<typeof ConvergenceAttractor>

export const ConvergencePoint = z.object({
  id: UlidString,
  branchId: UlidString,
  eventId: UlidString,
  anchorId: z.string().min(1),
  similarityNote: z.string().min(1),
  /**
   * Which structural attractor pulled this back toward the record (v2/M18).
   * Convergence without a named mechanism is coincidence, and coincidence is
   * not a finding. Defaulted so pre-M18 exports import unchanged.
   */
  attractor: ConvergenceAttractor.default('institutional'),
  /**
   * Years late (positive) or early (negative) against the baseline anchor.
   * The interesting convergences are the ones that arrive off schedule.
   */
  latenessYears: z.number().int().default(0),
  /** How the road differed, when it did: "still emerges, 40 years late, via Korea". */
  pathNote: z.string().nullable().default(null),
  provenance: Provenance,
})
export type ConvergencePoint = z.infer<typeof ConvergencePoint>
