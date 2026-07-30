import { z } from 'zod'
import { UlidString } from './ids.js'
import { CourtRulingOut } from './llm.js'
import { Provenance } from './provenance.js'

/**
 * The Court of Plausibility's persisted transcript (v2/M17): one bounded
 * adversarial exchange over a critic-disputed event - advocate brief, skeptic
 * brief, judge ruling. No loops, no appeals; the record is the point.
 */
export const CourtRecord = z.object({
  id: UlidString,
  branchId: UlidString,
  eventId: UlidString,
  advocate: z.string().min(1),
  skeptic: z.string().min(1),
  ruling: CourtRulingOut,
  createdAt: z.iso.datetime(),
  provenance: Provenance,
})
export type CourtRecord = z.infer<typeof CourtRecord>
