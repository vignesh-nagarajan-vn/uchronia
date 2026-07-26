import { z } from 'zod'
import { UlidString } from './ids.js'
import { Lens } from './lens.js'
import { Provenance } from './provenance.js'

/**
 * A curated real-history anchor event. ~200 of these form the baseline spine
 * (packages/core/data/baseline.json) - the blue line the divergence peels away
 * from, and the reference set for convergence detection. Always curated, never
 * generated.
 */
export const BaselineAnchor = z.object({
  id: z.string().min(1),
  year: z.number().int(),
  title: z.string().min(1),
  summary: z.string().min(1),
  region: z.string().min(1),
  lenses: z.array(Lens).min(1),
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
export const ConvergencePoint = z.object({
  id: UlidString,
  branchId: UlidString,
  eventId: UlidString,
  anchorId: z.string().min(1),
  similarityNote: z.string().min(1),
  provenance: Provenance,
})
export type ConvergencePoint = z.infer<typeof ConvergencePoint>
