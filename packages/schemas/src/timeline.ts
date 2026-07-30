import { z } from 'zod'
import { UlidString } from './ids.js'
import { Lens } from './lens.js'

export const Dial = z.number().int().min(0).max(100)
export type Dial = z.infer<typeof Dial>

/** Snapshot of the model configuration a timeline was generated with. */
export const ModelConfig = z.object({
  generation: z.string().min(1),
  critic: z.string().min(1),
  mode: z.enum(['mock', 'live']),
})
export type ModelConfig = z.infer<typeof ModelConfig>

/**
 * Advanced dial axes (v2/M17). When absent, every axis derives from the
 * master dial (see core/src/dial.ts); the flyout persists explicit values.
 */
export const DialAxes = z.object({
  /** 0 = structures move history, 100 = great persons genuinely can. */
  greatPersonWeight: Dial,
  /** 0 = technology plods along attested rails, 100 = leaps and stalls. */
  techVolatility: Dial,
  /** 0 = customs and faiths hold, 100 = they churn generation to generation. */
  culturalDrift: Dial,
  /** Seeded external shocks (plagues, storms, assassinations) as wildcards. */
  chaosEvents: z.boolean(),
})
export type DialAxes = z.infer<typeof DialAxes>

export const TimelineSettings = z.object({
  /** 0 = butterfly (contingency compounds), 100 = railroad (attractors win). */
  dial: Dial,
  /** Explicit axis overrides (v2/M17); absent = derived from the master dial. */
  axes: DialAxes.optional(),
  /** Symposium derives each era through specialist passes (v2/M17). */
  derivation: z.enum(['standard', 'symposium']).default('standard'),
  /** The Court of Plausibility on critic-disputed events (v2/M17; opt-in). */
  court: z.boolean().default(false),
  /**
   * How many years past the POD generation should reach. Since v2/M18 the
   * composer's default carries a history to the present day rather than
   * stopping a century or two out, so the cap is generous.
   */
  horizonYears: z.number().int().min(10).max(6000),
  /**
   * Append one speculative era past the horizon (v2/M18). It is marked
   * non-historical everywhere it is rendered: the engine is willing to guess
   * forward, but never quietly.
   */
  epilogue: z.boolean().default(false),
  defaultLenses: z.array(Lens),
  models: ModelConfig,
})
export type TimelineSettings = z.infer<typeof TimelineSettings>

export const Timeline = z.object({
  id: UlidString,
  title: z.string().min(1),
  createdAt: z.iso.datetime(),
  settings: TimelineSettings,
})
export type Timeline = z.infer<typeof Timeline>
