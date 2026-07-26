import { z } from 'zod'
import { EncyclopediaBody, LetterBody, NewspaperBody, PosterBody } from './artifact.js'
import { EDGE_KINDS } from './edge.js'
import { ENTITY_TYPES } from './entity.js'
import { Pressure } from './era.js'
import { CritiqueIssue, Plausibility } from './event.js'
import { Slug } from './ids.js'
import { Lens } from './lens.js'
import { MECHANISMS } from './pod.js'

/**
 * Shapes the LLM produces (drafts) - no ids, no provenance; the pipeline mints
 * those. Prompts hand the model short handles instead of ULIDs: entities are
 * referenced by slug, prior events as `e<ordinal>`, and drafts label
 * themselves `d1..dn` so the critic and the repair loop can point at them.
 */

export const DraftRef = z.string().regex(/^d\d+$/, 'draft refs look like d1, d2, …')
export type DraftRef = z.infer<typeof DraftRef>

/** Reference to an already-accepted event (`e<resolved position>`) or a draft in this batch. */
export const CauseRef = z.string().regex(/^[de]\d+$/, 'cause refs look like e12 or d2')
export type CauseRef = z.infer<typeof CauseRef>

/**
 * State facts travel as typed key/value pairs, not records: strict structured
 * outputs require additionalProperties:false, which open maps cannot satisfy.
 * The engine folds pairs into StateRecords at draft resolution.
 */
export const StateFact = z.object({
  key: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()]),
})
export type StateFact = z.infer<typeof StateFact>

export const DraftNewEntity = z.object({
  slug: Slug,
  name: z.string().min(1),
  type: z.enum(ENTITY_TYPES),
  description: z.string().min(1),
  initialState: z.array(StateFact).min(1),
})
export type DraftNewEntity = z.infer<typeof DraftNewEntity>

export const DraftDelta = z.object({
  entitySlug: Slug,
  patch: z.array(StateFact).min(1),
  note: z.string().min(1),
  /** True when this event permanently ends the entity (death, dissolution). */
  ends: z.boolean().optional(),
})
export type DraftDelta = z.infer<typeof DraftDelta>

export const DraftCause = z.object({
  ref: CauseRef,
  kind: z.enum(EDGE_KINDS),
  strength: z.number().min(0).max(1),
})
export type DraftCause = z.infer<typeof DraftCause>

export const DraftEvent = z.object({
  ref: DraftRef,
  year: z.number().int(),
  dateLabel: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  lenses: z.array(Lens).min(1).max(3),
  entitySlugs: z.array(Slug).min(1),
  newEntities: z.array(DraftNewEntity),
  deltas: z.array(DraftDelta),
  causes: z.array(DraftCause),
  plausibility: Plausibility,
  wildcard: z.boolean(),
})
export type DraftEvent = z.infer<typeof DraftEvent>

/** pod-normalize output. */
export const PodNormalizedOut = z.object({
  statement: z.string().min(1),
  year: z.number().int(),
  dateLabel: z.string().min(1),
  region: z.string().min(1),
  mechanism: z.enum(MECHANISMS),
  baselineContext: z.string().min(1),
  suggestedTitle: z.string().min(1),
})
export type PodNormalizedOut = z.infer<typeof PodNormalizedOut>

/** derive-pressures output. */
export const PressuresOut = z.object({
  pressures: z.array(Pressure).min(3).max(7),
})
export type PressuresOut = z.infer<typeof PressuresOut>

/** seed-consequences and era-generate output: an era header plus its drafts. */
export const EraBatchOut = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  events: z.array(DraftEvent).min(2).max(10),
})
export type EraBatchOut = z.infer<typeof EraBatchOut>

/** critic-review output: verdicts keyed by draft ref. */
export const CritiqueOut = z.object({
  verdicts: z
    .array(
      z.object({
        ref: DraftRef,
        issues: z.array(CritiqueIssue),
        verdict: z.enum(['pass', 'revise', 'dispute']),
      }),
    )
    .min(1),
})
export type CritiqueOut = z.infer<typeof CritiqueOut>

/** regenerate-event output: one replacement draft. */
export const RegeneratedEventOut = z.object({
  event: DraftEvent,
})
export type RegeneratedEventOut = z.infer<typeof RegeneratedEventOut>

/** convergence-scan output. */
export const ConvergenceScanOut = z.object({
  matches: z.array(
    z.object({
      ref: DraftRef,
      anchorId: z.string().min(1),
      similarityNote: z.string().min(1),
    }),
  ),
})
export type ConvergenceScanOut = z.infer<typeof ConvergenceScanOut>

/** event-expand / era-deepdive output. */
export const ExpandOut = z.object({
  detail: z.string().min(1),
})
export type ExpandOut = z.infer<typeof ExpandOut>

/** entity-biography output. */
export const BiographyOut = z.object({
  biography: z.string().min(1),
})
export type BiographyOut = z.infer<typeof BiographyOut>

/** Artifact generator outputs: the per-kind bodies plus a display title. */
export const NewspaperOut = z.object({ title: z.string().min(1), body: NewspaperBody })
export const LetterOut = z.object({ title: z.string().min(1), body: LetterBody })
export const EncyclopediaOut = z.object({ title: z.string().min(1), body: EncyclopediaBody })
export const PosterOut = z.object({ title: z.string().min(1), body: PosterBody })
export type NewspaperOut = z.infer<typeof NewspaperOut>
export type LetterOut = z.infer<typeof LetterOut>
export type EncyclopediaOut = z.infer<typeof EncyclopediaOut>
export type PosterOut = z.infer<typeof PosterOut>
