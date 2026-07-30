import type { Mechanism, PodNormalizedOut } from '@uchronia/schemas'
import { loadBaseline } from '../baseline.js'
import { sketchPod } from '../pod-sketch.js'
import type { PodNormalizeArgs } from '../prompts/pod-normalize.js'
import type { Rng } from '../rng.js'

export const TITLE_BANKS: Record<Mechanism, string[]> = {
  knowledge: [
    'The Unburnt Archive',
    'The Long Library',
    'A Republic of Letters',
    'The Kept Catalogue',
    'What the Copyists Saved',
    'The Margin Notes of Another Age',
  ],
  disease: [
    'The Spared Generation',
    'The Quiet Wards',
    'A World Less Mourned',
    'The Fever That Never Came',
    'A Census of the Living',
    'The Unrung Bells',
  ],
  politics: [
    'The Road Not Signed',
    'A Crown Withheld',
    'The Standing Wall',
    'The Treaty of Another Spring',
    'An Empire of Second Thoughts',
    'The Unsummoned Council',
  ],
  technology: [
    'The Early Engine',
    'The Patient Machine',
    'Sparks Out of Season',
    'The Workshop Century',
    'An Age of Other Instruments',
    'The Blueprint That Waited',
  ],
  economics: [
    'The Other Ledger',
    'Coin and Consequence',
    'The Unbroken Exchange',
    'A Different Rate of Interest',
    'The Long Invoice',
    'Markets of the Might-Have-Been',
  ],
  environment: [
    'The Sky That Held',
    'A Kinder Season',
    'The Unfallen Ash',
    'The Patient Weather',
    'A Harvest Rewritten',
    'The Year Without a Ruin',
  ],
  culture: [
    'The Second Canon',
    'A Different Congregation',
    'The Altered Chorus',
    'The Liturgy of Elsewhere',
    'A Fashion for Other Truths',
    'The Custom That Outlived Its Century',
  ],
}

export const CONTEXT_CLAUSES: Record<Mechanism, string> = {
  knowledge: 'what was written and copied there set the ceiling on what later centuries could know',
  disease: 'sickness and its rumor governed cities more surely than any edict',
  politics: 'thrones, levies, and alliances were being renegotiated by force and marriage alike',
  technology: 'workshops and arsenals were quietly deciding which futures would be affordable',
  economics: 'credit, bullion, and grain moved along routes that empires only pretended to command',
  environment: 'harvests and weather set the real budget of every state',
  culture: 'belief and custom were the operating system of daily life',
}

export function yearLabel(year: number): string {
  return year < 0 ? `${Math.abs(year)} BC` : String(year)
}

export function normalizeStatement(text: string): string {
  let statement = text
    .replace(/^\s*what\s+(would\s+have\s+happened\s+)?if\s+/i, '')
    .replace(/\?+\s*$/, '')
    .trim()
  if (statement.length === 0) statement = text
  statement = statement.charAt(0).toUpperCase() + statement.slice(1)
  if (!/[.!]$/.test(statement)) statement = `${statement}.`
  return statement
}

/**
 * Fallback when text carries no year, no known event, and no anchor overlap:
 * a fixed neutral modern hinge. Deterministic by construction - the v1
 * random-century roll is dead (v2/M14).
 */
export const FALLBACK_YEAR = 1900

/**
 * Deterministic pod intake for demo mode (v2/M14 rewrite): named-event
 * aliases, real year parsing (3-4 digit years; era markers for short ones),
 * and anchor snapping via the shared sketch - so "What if the Allies lost
 * World War 2" lands in 1939-1945, never in a random century.
 */
export function mockPodNormalize(rawArgs: unknown, rng: Rng): PodNormalizedOut {
  const { raw } = rawArgs as PodNormalizeArgs
  const text = raw.trim()
  const sketch = sketchPod(text, loadBaseline().anchors)

  const year = sketch.year ?? FALLBACK_YEAR
  const mechanism = sketch.mechanism ?? 'politics'
  const region = sketch.region ?? 'the wider world'
  const statement = normalizeStatement(text)
  const label = yearLabel(year)

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
    baselineContext: `In the attested record of ${label}, ${region === 'the wider world' ? 'the world' : region} stood at a hinge: ${CONTEXT_CLAUSES[mechanism]}.${grounding} The divergence departs from that settled course.`,
    suggestedTitle: rng.pick(TITLE_BANKS[mechanism]),
  }
}
