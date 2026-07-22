import { z } from 'zod'
import { UlidString } from './ids.js'
import { Provenance } from './provenance.js'

export const PRESSURE_KINDS = [
  'demographic',
  'economic',
  'technological',
  'ideological',
  'environmental',
] as const
export const PressureKind = z.enum(PRESSURE_KINDS)
export type PressureKind = z.infer<typeof PressureKind>

/**
 * A named tension read off the world-state before generating an era. Pressures
 * are what make era N+1 feel *caused by* era N instead of merely following it.
 */
export const Pressure = z.object({
  name: z.string().min(1),
  kind: PressureKind,
  description: z.string().min(1),
  /** How urgently this tension is pressing, 0–1. */
  intensity: z.number().min(0).max(1),
})
export type Pressure = z.infer<typeof Pressure>

export const EraStatus = z.enum(['skeleton', 'expanded'])
export type EraStatus = z.infer<typeof EraStatus>

export const Era = z.object({
  id: UlidString,
  branchId: UlidString,
  /** Position within its branch's own eras, 0-based. */
  ordinal: z.number().int().min(0),
  startYear: z.number().int(),
  endYear: z.number().int(),
  title: z.string().min(1),
  summary: z.string().min(1),
  pressures: z.array(Pressure),
  status: EraStatus,
  /** Lazily generated deep-dive essay; null until expanded. */
  detail: z.string().nullable(),
  provenance: Provenance,
})
export type Era = z.infer<typeof Era>
