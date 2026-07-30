import type { Lens, Mechanism, PodCandidate, PodInterpretedOut } from '@uchronia/schemas'
import { loadBaseline } from '../baseline.js'
import { sketchPod } from '../pod-sketch.js'
import type { PodInterpretArgs } from '../prompts/pod-interpret.js'
import { retrieveAnchors } from '../retrieval.js'
import type { Rng } from '../rng.js'
import {
  CONTEXT_CLAUSES,
  FALLBACK_YEAR,
  normalizeStatement,
  TITLE_BANKS,
  yearLabel,
} from './pod-normalize.js'

const LENS_MECHANISM: Record<Lens, Mechanism> = {
  political: 'politics',
  technological: 'technology',
  cultural: 'culture',
  economic: 'economics',
  'daily-life': 'culture',
}

/**
 * Demo-mode interpretation (v2/M14). Alias hits carry canned, historically
 * real candidate mechanisms (an Allied loss offers Sea Lion, Moscow, Pearl
 * Harbor, the German bomb); other asks build candidates from the nearest
 * curated anchors; garbage gets an honest low-confidence fallback with a
 * clarifying question, never a random century.
 */
export function mockPodInterpret(rawArgs: unknown, rng: Rng): PodInterpretedOut {
  const { raw } = rawArgs as PodInterpretArgs
  const text = raw.trim()
  const anchors = loadBaseline().anchors
  const sketch = sketchPod(text, anchors)
  const statement = normalizeStatement(text)

  let candidates: PodCandidate[]
  const ambiguities: string[] = []
  let confidence: number

  if (sketch.aliasCandidates) {
    candidates = sketch.aliasCandidates.slice(0, 4)
    confidence = 0.85
    if (sketch.yearSource !== 'explicit') {
      ambiguities.push(`which hinge of ${sketch.aliasLabel} the divergence bends`)
    }
  } else {
    const near = retrieveAnchors(anchors, text, { year: sketch.year, limit: 3 })
    candidates = near.map((anchor) => ({
      label: `${anchor.title}, otherwise`,
      year: anchor.year,
      dateLabel: yearLabel(anchor.year),
      region: anchor.region,
      mechanism: anchor.lenses[0] ? LENS_MECHANISM[anchor.lenses[0]] : 'politics',
      rationale: anchor.summary,
    }))
    confidence =
      sketch.yearSource === 'explicit' ? 0.82 : sketch.yearSource === 'anchor' ? 0.62 : 0.3
    if (candidates.length === 0) {
      ambiguities.push('no recognizable year or named event in the ask')
      candidates = [
        {
          label: statement,
          year: sketch.year ?? FALLBACK_YEAR,
          dateLabel: yearLabel(sketch.year ?? FALLBACK_YEAR),
          region: sketch.region ?? 'the wider world',
          mechanism: sketch.mechanism ?? 'politics',
          rationale:
            'The ask names no year or event the record recognizes; the ledger opens at a neutral modern hinge.',
        },
      ]
    }
  }

  const primary = candidates[0]
  if (!primary) throw new Error('mock interpretation produced no candidates')
  const year = sketch.yearSource === 'explicit' && sketch.year !== null ? sketch.year : primary.year
  const region = sketch.region ?? primary.region
  const mechanism = sketch.mechanism ?? primary.mechanism
  const label = sketch.yearSource === 'explicit' ? yearLabel(year) : primary.dateLabel

  const grounding = sketch.aliasLabel
    ? ` The divergence bends ${sketch.aliasLabel}.`
    : sketch.matchedAnchor
      ? ` Nearby in the record: ${sketch.matchedAnchor.title} (${yearLabel(sketch.matchedAnchor.year)}).`
      : ''

  return {
    statement,
    year,
    dateLabel: label,
    region,
    mechanism,
    baselineContext: `In the attested record of ${yearLabel(year)}, ${region === 'the wider world' ? 'the world' : region} stood at a hinge: ${CONTEXT_CLAUSES[mechanism]}.${grounding} The divergence departs from that settled course.`,
    suggestedTitle: rng.pick(TITLE_BANKS[mechanism]),
    confidence,
    ambiguities,
    candidates,
    clarifyingQuestion:
      confidence < 0.55 && candidates.length >= 2
        ? {
            question: 'Which divergence should the ledger open at?',
            options: candidates.slice(0, 4).map((c) => c.label),
          }
        : null,
  }
}
