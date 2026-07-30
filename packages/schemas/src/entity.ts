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
  /**
   * When it began: birth for a person, founding for a nation, institution, or
   * movement, first working example for a technology (v2/M18). Null when the
   * record does not fix one. The end is never stored: an entity is ended on a
   * branch iff a visible delta says so (see {@link StateDelta.ends}).
   */
  bornYear: z.number().int().nullable().default(null),
  /**
   * True for people and bodies this history invented, who have no attested
   * counterpart (v2/M18). The divergence is allowed to mint them; the reader
   * is entitled to know which ones it minted.
   */
  counterfactual: z.boolean().default(false),
  /** The entity this one follows in a line or an office; null when it opens one. */
  succeedsSlug: Slug.nullable().default(null),
  createdAt: z.iso.datetime(),
  provenance: Provenance,
})
export type Entity = z.infer<typeof Entity>

/**
 * One span during which an entity held a role, derived by replaying the
 * `role` key of the deltas visible on a branch (v2/M18). Never stored: like
 * all state, a tenure is whatever the visible events say it is.
 */
export const RoleTenure = z.object({
  role: z.string().min(1),
  startYear: z.number().int(),
  /** Null while the role is still held at the end of the visible record. */
  endYear: z.number().int().nullable(),
  startEventId: UlidString,
  endEventId: UlidString.nullable(),
})
export type RoleTenure = z.infer<typeof RoleTenure>

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
  /** Role spans read off this branch's ledger (v2/M18); empty for most entities. */
  tenures: z.array(RoleTenure).default([]),
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
