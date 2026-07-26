import { z } from 'zod'
import { Slug, UlidString } from './ids.js'
import { Provenance } from './provenance.js'
import { StateRecord } from './state.js'

export const ENTITY_TYPES = ['person', 'nation', 'technology', 'institution', 'movement'] as const
export const EntityType = z.enum(ENTITY_TYPES)
export type EntityType = z.infer<typeof EntityType>

/**
 * The persisted entity: identity plus the state it was introduced with.
 * Branch-local state and the changeLog are *derived* by replaying the deltas
 * of the events visible on a branch (see docs/DATA_MODEL.md) - the API serves
 * {@link EntityView}.
 */
export const Entity = z.object({
  id: UlidString,
  timelineId: UlidString,
  /** Short handle used by LLM output and prompts to reference this entity. */
  slug: Slug,
  type: EntityType,
  name: z.string().min(1),
  description: z.string().min(1),
  initialState: StateRecord,
  /** Event that introduced it; null when seeded at POD intake. */
  introducedByEventId: UlidString.nullable(),
  createdAt: z.iso.datetime(),
  provenance: Provenance,
})
export type Entity = z.infer<typeof Entity>

/** One rendered line of a dossier's ledger. */
export const LedgerLine = z.object({
  eventId: UlidString,
  year: z.number().int(),
  dateLabel: z.string(),
  patch: StateRecord,
  note: z.string(),
})
export type LedgerLine = z.infer<typeof LedgerLine>

/** Branch-resolved view: current state + the ledger that produced it. */
export const EntityView = Entity.extend({
  state: StateRecord,
  changeLog: z.array(LedgerLine),
  /**
   * Event whose terminal delta ended this entity on THIS branch; null while
   * it lives. Derived by replay (see StateDelta.ends) - never stored, so a
   * sibling branch that cannot see the ending event still shows it alive.
   */
  endedByEventId: UlidString.nullable().default(null),
})
export type EntityView = z.infer<typeof EntityView>

/** Lazily generated in-timeline biography, branch-specific by nature. */
export const EntityBiography = z.object({
  id: UlidString,
  entityId: UlidString,
  branchId: UlidString,
  biography: z.string().min(1),
  provenance: Provenance,
})
export type EntityBiography = z.infer<typeof EntityBiography>
