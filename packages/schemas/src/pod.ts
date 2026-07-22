import { z } from 'zod'
import { UlidString } from './ids.js'
import { Provenance } from './provenance.js'

/** What kind of lever the divergence pulls. */
export const MECHANISMS = [
  'knowledge',
  'disease',
  'politics',
  'technology',
  'economics',
  'environment',
  'culture',
] as const
export const Mechanism = z.enum(MECHANISMS)
export type Mechanism = z.infer<typeof Mechanism>

export const PointOfDivergence = z.object({
  id: UlidString,
  timelineId: UlidString,
  /** The user's freeform text, kept verbatim. */
  raw: z.string().min(1),
  /** Normalized one-sentence statement of the divergence. */
  statement: z.string().min(1),
  /** Astronomical year numbering is not used: negative = BC, no year zero. */
  year: z.number().int(),
  dateLabel: z.string().min(1),
  region: z.string().min(1),
  mechanism: Mechanism,
  /** Short summary of the real-history situation at that date. */
  baselineContext: z.string().min(1),
  provenance: Provenance,
})
export type PointOfDivergence = z.infer<typeof PointOfDivergence>
