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

export const TimelineSettings = z.object({
  /** 0 = butterfly (contingency compounds), 100 = railroad (attractors win). */
  dial: Dial,
  /** How many years past the POD generation should reach. */
  horizonYears: z.number().int().min(10).max(3000),
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
