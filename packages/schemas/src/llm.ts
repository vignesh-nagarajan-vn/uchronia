import { z } from 'zod'
import {
  ClassifiedBody,
  EncyclopediaBody,
  LetterBody,
  NewspaperBody,
  ObituaryBody,
  PosterBody,
  RadioBody,
  TelegramBody,
} from './artifact.js'
import { NAME_DRIFT_KINDS, REGIONAL_INDICES } from './claim.js'
import { ANCHOR_REGIONS, CONVERGENCE_ATTRACTORS } from './convergence.js'
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
  /** Birth, founding, or first working example (v2/M18); null when unfixed. */
  bornYear: z.number().int().nullable().optional(),
  /**
   * True for a person or body this history invented (v2/M18). The engine
   * records which of its actors never existed rather than hoping nobody asks.
   */
  counterfactual: z.boolean().optional(),
  /** The entity this one follows in a line or an office, by slug. */
  succeedsSlug: Slug.nullable().optional(),
})
export type DraftNewEntity = z.infer<typeof DraftNewEntity>

/**
 * A regional index reading an era asserts (v2/M18). Bounded by the validator:
 * a jump beyond MAX_INDEX_DELTA needs a catastrophe, not a sentence.
 */
export const DraftIndexShift = z.object({
  region: z.enum(ANCHOR_REGIONS),
  index: z.enum(REGIONAL_INDICES),
  /** The reading after this era, 0-100. */
  value: z.number().int().min(0).max(100),
  note: z.string().min(1),
})
export type DraftIndexShift = z.infer<typeof DraftIndexShift>

/** A name this history moved (v2/M18). Naming only, never a constructed language. */
export const DraftNameDrift = z.object({
  ref: DraftRef,
  nameKind: z.enum(NAME_DRIFT_KINDS),
  attested: z.string().min(1),
  drifted: z.string().min(1),
  note: z.string().min(1),
})
export type DraftNameDrift = z.infer<typeof DraftNameDrift>

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

/**
 * One candidate divergence mechanism the interpreter offers (v2/M14): a
 * concrete, historically real way the asked-for divergence could happen.
 */
export const PodCandidate = z.object({
  /** Short label, e.g. "Operation Sea Lion succeeds". */
  label: z.string().min(1),
  year: z.number().int(),
  dateLabel: z.string().min(1),
  region: z.string().min(1),
  mechanism: z.enum(MECHANISMS),
  /** One line on why this is a real hinge for the asked divergence. */
  rationale: z.string().min(1),
})
export type PodCandidate = z.infer<typeof PodCandidate>

/**
 * pod-interpret output (v2/M14): the model's primary reading of the user's
 * divergence plus selectable candidate mechanisms. Replaces bare
 * normalization as the composer's entry point; nothing is created from it
 * until the user confirms.
 */
export const PodInterpretedOut = z.object({
  statement: z.string().min(1),
  year: z.number().int(),
  dateLabel: z.string().min(1),
  region: z.string().min(1),
  mechanism: z.enum(MECHANISMS),
  baselineContext: z.string().min(1),
  suggestedTitle: z.string().min(1),
  /** 0-1: how sure the interpreter is that the primary reading is what was meant. */
  confidence: z.number().min(0).max(1),
  /** Named ambiguities in the request (empty when the ask is clear). */
  ambiguities: z.array(z.string()),
  /** 1-4 concrete ways the divergence could happen; the first is the primary. */
  candidates: z.array(PodCandidate).min(1).max(4),
  /** One optional clarifying round when confidence is low. Never a chat loop. */
  clarifyingQuestion: z
    .object({
      question: z.string().min(1),
      options: z.array(z.string().min(1)).min(2).max(4),
    })
    .nullable(),
})
export type PodInterpretedOut = z.infer<typeof PodInterpretedOut>

/** The symposium synthesizer's output (v2/M17): a merged era + disagreements. */
export const SymposiumOut = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  events: z.array(DraftEvent).min(2).max(10),
  /** Refs where the specialists genuinely disagreed, with the disagreement. */
  contested: z.array(
    z.object({
      ref: DraftRef,
      note: z.string().min(1),
    }),
  ),
})
export type SymposiumOut = z.infer<typeof SymposiumOut>

/** Court of Plausibility briefs and ruling (v2/M17). */
export const CourtBriefOut = z.object({
  brief: z.string().min(1),
})
export type CourtBriefOut = z.infer<typeof CourtBriefOut>

export const CourtRulingOut = z.object({
  outcome: z.enum(['uphold', 'revise', 'dispute']),
  opinion: z.string().min(1),
  /** Required when the outcome is revise: what the retelling must fix. */
  instruction: z.string().nullable(),
})
export type CourtRulingOut = z.infer<typeof CourtRulingOut>

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
  /**
   * Where the era left the coarse regional dials (v2/M18). Optional: an era
   * that moved nothing says nothing, and the previous reading stands.
   */
  indexShifts: z.array(DraftIndexShift).max(8).optional(),
  /**
   * Names this era moved (v2/M18), emitted opportunistically rather than by
   * a separate call. Usually empty; a conquest or a schism fills it.
   */
  nameDrift: z.array(DraftNameDrift).max(6).optional(),
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
      /** Which structural attractor did the pulling (v2/M18). */
      attractor: z.enum(CONVERGENCE_ATTRACTORS).optional(),
      /** How the road differed, when it did; null when it did not. */
      pathNote: z.string().nullable().optional(),
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
export const TelegramOut = z.object({ title: z.string().min(1), body: TelegramBody })
export const RadioOut = z.object({ title: z.string().min(1), body: RadioBody })
export const ObituaryOut = z.object({ title: z.string().min(1), body: ObituaryBody })
export const ClassifiedOut = z.object({ title: z.string().min(1), body: ClassifiedBody })
export type TelegramOut = z.infer<typeof TelegramOut>
export type RadioOut = z.infer<typeof RadioOut>
export type ObituaryOut = z.infer<typeof ObituaryOut>
export type ClassifiedOut = z.infer<typeof ClassifiedOut>
export type NewspaperOut = z.infer<typeof NewspaperOut>
export type LetterOut = z.infer<typeof LetterOut>
export type EncyclopediaOut = z.infer<typeof EncyclopediaOut>
export type PosterOut = z.infer<typeof PosterOut>
