import { z } from 'zod'

/**
 * Lenses are the five registers every consequence must be able to speak in.
 * They filter and recolor the timeline (F5) and are a first-class field on events.
 */
export const LENSES = ['political', 'technological', 'cultural', 'economic', 'daily-life'] as const

export const Lens = z.enum(LENSES)
export type Lens = z.infer<typeof Lens>
