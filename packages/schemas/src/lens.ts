import { z } from 'zod'

/**
 * Lenses are the registers every consequence must be able to speak in. They
 * filter and recolor the timeline (F5) and are a first-class field on events.
 *
 * The first five are the original set. `philology` (v2/M18) is narrower on
 * purpose: it collects the events that moved a name, so a reader can follow
 * how the vocabulary of a history drifted away from the attested one. It is
 * never a default lens, because most eras have nothing to say in it.
 */
export const LENSES = [
  'political',
  'technological',
  'cultural',
  'economic',
  'daily-life',
  'philology',
] as const

export const Lens = z.enum(LENSES)
export type Lens = z.infer<typeof Lens>

/**
 * What a new timeline starts with. Philology is filterable but not default:
 * switching it on for every chronicle would promise a register most eras
 * never speak in.
 */
export const DEFAULT_LENSES = LENSES.filter((l) => l !== 'philology') as readonly Lens[]
