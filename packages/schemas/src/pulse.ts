import { z } from 'zod'
import { Slug, UlidString } from './ids.js'
import { Provenance } from './provenance.js'

/**
 * The counterfactual pulse (v2/M19): before committing a fork, ask what one
 * flip would actually do. A single generation-tier call over local world
 * state returns a handful of predicted consequences, which the UI renders as
 * a ghost preview. Nothing about a pulse is history: it is a forecast the
 * reader may accept by forking, and it is cached per (event, flip).
 */

export const PULSE_DELTA_KINDS = ['entity', 'pressure', 'convergence'] as const
export const PulseDeltaKind = z.enum(PULSE_DELTA_KINDS)
export type PulseDeltaKind = z.infer<typeof PulseDeltaKind>

export const PulseDelta = z.object({
  kind: PulseDeltaKind,
  /** Entity slug, pressure name, or anchor id, depending on the kind. */
  subject: z.string().min(1),
  /** What the flip does to it, in one clause. */
  effect: z.string().min(1),
  /** 0-1: how confidently this follows from the state, not how dramatic it is. */
  confidence: z.number().min(0).max(1),
})
export type PulseDelta = z.infer<typeof PulseDelta>

/** What the model returns for a pulse. */
export const PulseOut = z.object({
  /** One sentence naming what the flip actually changes. */
  headline: z.string().min(1),
  deltas: z.array(PulseDelta).min(3).max(8),
  /** Convergences this flip most likely breaks, by anchor id; may be empty. */
  breaks: z.array(z.string().min(1)).max(4),
  /** The sub-divergence statement a fork would open with, ready to accept. */
  suggestedSubPod: z.string().min(1),
})
export type PulseOut = z.infer<typeof PulseOut>

/** A pulse as stored: the forecast plus what it was a forecast about. */
export const Pulse = z.object({
  id: UlidString,
  branchId: UlidString,
  eventId: UlidString,
  /** The reader's flip, verbatim; empty means "what if this had not happened". */
  flip: z.string().max(500),
  headline: z.string().min(1),
  deltas: z.array(PulseDelta),
  breaks: z.array(z.string()),
  suggestedSubPod: z.string().min(1),
  createdAt: z.iso.datetime(),
  provenance: Provenance,
})
export type Pulse = z.infer<typeof Pulse>

/** POST /branches/:branchId/events/:eventId/pulse */
export const PulseRequest = z.object({
  /** The reader's flip; absent means "what if this had not happened". */
  flip: z.string().max(500).optional(),
})
export type PulseRequest = z.infer<typeof PulseRequest>

export const PulseResponse = z.object({ pulse: Pulse })
export type PulseResponse = z.infer<typeof PulseResponse>

/** Entity fates across every branch of a timeline (v2/M19). Pure data, no calls. */
export const EntityFate = z.object({
  branchId: UlidString,
  branchName: z.string().min(1),
  /** The entity's last recorded state on that branch, as a role or status line. */
  standing: z.string().min(1),
  /** Whether a visible delta ended it on that branch. */
  ended: z.boolean(),
  endedYear: z.number().int().nullable(),
  /** The event that most defines it there, by title. */
  definingEvent: z.string().nullable(),
  eventCount: z.number().int().min(0),
})
export type EntityFate = z.infer<typeof EntityFate>

export const EntityFatesResponse = z.object({
  entitySlug: Slug,
  name: z.string().min(1),
  fates: z.array(EntityFate),
})
export type EntityFatesResponse = z.infer<typeof EntityFatesResponse>
