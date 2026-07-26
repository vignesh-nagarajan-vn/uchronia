import type { ConvergenceScanOut } from '@uchronia/schemas'
import type { ConvergenceScanArgs } from '../prompts/convergence-scan.js'
import type { Rng } from '../rng.js'

const NOTE_TEMPLATES = [
  (a: string) =>
    `The same channel fills by another road: this history arrives where "${a}" already stood in the record.`,
  (a: string) =>
    `Structure reasserts itself; the shape of "${a}" emerges here despite the divergence.`,
  (a: string) =>
    `Different causes, familiar outcome: the attested "${a}" finds its counterpart in this line.`,
]

/**
 * Deterministic convergence detection for mock mode: at most one match per
 * era - the event/anchor pair with the smallest year gap within 30 years,
 * gated so convergence stays special rather than routine.
 */
export function mockConvergenceScan(rawArgs: unknown, rng: Rng): ConvergenceScanOut {
  const { events, candidates } = rawArgs as ConvergenceScanArgs
  if (events.length === 0 || candidates.length === 0) return { matches: [] }
  if (rng.next() > 0.65) return { matches: [] }

  let best: { ref: string; anchorId: string; gap: number; title: string } | null = null
  for (const event of events) {
    for (const anchor of candidates) {
      const gap = Math.abs(event.year - anchor.year)
      if (gap <= 30 && (best === null || gap < best.gap)) {
        best = { ref: event.ref, anchorId: anchor.id, gap, title: anchor.title }
      }
    }
  }
  if (!best) return { matches: [] }

  const note = NOTE_TEMPLATES[rng.int(0, NOTE_TEMPLATES.length - 1)] ?? NOTE_TEMPLATES[0]
  if (!note) return { matches: [] }
  return {
    matches: [{ ref: best.ref, anchorId: best.anchorId, similarityNote: note(best.title) }],
  }
}
