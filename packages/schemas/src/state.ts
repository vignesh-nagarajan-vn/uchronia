import { z } from 'zod'
import { UlidString } from './ids.js'

/**
 * Entity state is a flat record of legible scalar facts (plus string lists),
 * deliberately not arbitrary JSON: ledger lines must read like a ledger —
 * `literacyRate: 0.04 → 0.11`, `capital: "Byzantion"`. Depth belongs in prose.
 */
export const StateValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.string()),
])
export type StateValue = z.infer<typeof StateValue>

export const StateRecord = z.record(z.string(), StateValue)
export type StateRecord = z.infer<typeof StateRecord>

/**
 * A recorded mutation of one entity's state, carried by the event that caused
 * it. An entity's changeLog and any point-in-time snapshot are derived by
 * replaying the deltas of the events visible on a branch — single source of
 * truth, so branch-local state is consistent by construction (P1).
 */
export const StateDelta = z.object({
  entityId: UlidString,
  patch: StateRecord.refine((p) => Object.keys(p).length > 0, 'patch must not be empty'),
  note: z.string().min(1),
})
export type StateDelta = z.infer<typeof StateDelta>
