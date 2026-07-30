import { z } from 'zod'
import { UlidString } from './ids.js'
import { Provenance } from './provenance.js'

/**
 * In-world historiography (v2/M20). Every history that gets written down gets
 * argued about, and the argument is part of the record. Two or three rival
 * schools are derived once per branch from its world-state; an event can then
 * be glossed through all of them in one call.
 *
 * These are schools *inside* the timeline. They do not know they are fiction,
 * they do not know our history, and they disagree with each other for reasons
 * their own world supplies.
 */

export const HistoriographicSchool = z.object({
  id: UlidString,
  branchId: UlidString,
  /** What this school calls itself, or what its opponents call it. */
  name: z.string().min(1),
  /** The one-line position: what it thinks history is driven by. */
  stance: z.string().min(1),
  /** Where and roughly when it formed, in this world's own terms. */
  seat: z.string().min(1),
  /** What its critics say it cannot explain. Every school has one. */
  blindSpot: z.string().min(1),
  provenance: Provenance,
})
export type HistoriographicSchool = z.infer<typeof HistoriographicSchool>

export const Interpretation = z.object({
  id: UlidString,
  branchId: UlidString,
  eventId: UlidString,
  schoolId: UlidString,
  /** How that school reads this event, in its own voice. */
  gloss: z.string().min(1),
  provenance: Provenance,
})
export type Interpretation = z.infer<typeof Interpretation>

/** historiography-schools output: the rival readings a branch produced. */
export const SchoolsOut = z.object({
  schools: z
    .array(
      z.object({
        name: z.string().min(1),
        stance: z.string().min(1),
        seat: z.string().min(1),
        blindSpot: z.string().min(1),
      }),
    )
    .min(2)
    .max(3),
})
export type SchoolsOut = z.infer<typeof SchoolsOut>

/** event-interpretation output: one gloss per school, in the order given. */
export const InterpretationsOut = z.object({
  glosses: z
    .array(
      z.object({
        school: z.string().min(1),
        gloss: z.string().min(1),
      }),
    )
    .min(2)
    .max(3),
})
export type InterpretationsOut = z.infer<typeof InterpretationsOut>
