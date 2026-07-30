import { CONVERGENCE_ATTRACTORS, type ConvergenceScanOut } from '@uchronia/schemas'
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
  // v2/M18: the demo names an attractor and, when the years actually differ,
  // says the road was not the attested one. Lateness itself is arithmetic and
  // is computed by the pipeline, never asserted here.
  const anchor = candidates.find((c) => c.id === best.anchorId)
  return {
    matches: [
      {
        ref: best.ref,
        anchorId: best.anchorId,
        similarityNote: note(best.title),
        attractor: rng.pick(CONVERGENCE_ATTRACTORS),
        pathNote:
          best.gap > 5 && anchor
            ? `It arrives anyway, ${best.gap} years off the attested schedule and by a road the record does not know.`
            : null,
      },
    ],
  }
}
