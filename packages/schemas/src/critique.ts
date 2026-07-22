import { z } from 'zod'
import { CritiqueIssue } from './event.js'
import { UlidString } from './ids.js'
import { Provenance } from './provenance.js'

export const CritiqueVerdict = z.enum(['pass', 'revise', 'dispute'])
export type CritiqueVerdict = z.infer<typeof CritiqueVerdict>

export const EventVerdict = z.object({
  eventId: UlidString,
  issues: z.array(CritiqueIssue),
  verdict: CritiqueVerdict,
})
export type EventVerdict = z.infer<typeof EventVerdict>

/**
 * The critic's verdict sheet for one generated batch. The critic never
 * rewrites — it verdicts; the pipeline regenerates or marks disputed (§4.5).
 */
export const CritiqueReport = z.object({
  id: UlidString,
  branchId: UlidString,
  /** Groups the verdicts of one generation batch (seed or one era). */
  batchId: UlidString,
  eraId: UlidString.nullable(),
  verdicts: z.array(EventVerdict),
  createdAt: z.iso.datetime(),
  provenance: Provenance,
})
export type CritiqueReport = z.infer<typeof CritiqueReport>
