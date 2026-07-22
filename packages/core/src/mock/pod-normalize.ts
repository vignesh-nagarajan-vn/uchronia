import type { Mechanism, PodNormalizedOut } from '@uchronia/schemas'
import type { PodNormalizeArgs } from '../prompts/pod-normalize.js'
import type { Rng } from '../rng.js'

const MECHANISM_KEYWORDS: Array<[Mechanism, RegExp]> = [
  [
    'knowledge',
    /\b(librar|book|scroll|manuscript|archive|scholar|alexandri|print|gutenberg|encyclopedi)/i,
  ],
  ['disease', /\b(plague|disease|pandemic|epidemic|pox|influenza|penicillin|vaccine|cholera)/i],
  [
    'technology',
    /\b(engine|steam|machine|invention|process|haber|apollo|rocket|electri|telegraph|computer|fleet)/i,
  ],
  ['economics', /\b(trade|bank|market|coin|currency|tax|merchant|silk road|economic)/i],
  ['environment', /\b(storm|climate|volcan|drought|flood|earthquake|carrington|famine|harvest)/i],
  ['culture', /\b(religio|church|faith|art|music|language|reformation|philosoph|school)/i],
  [
    'politics',
    /\b(war|battle|siege|treaty|empire|king|queen|emperor|revolution|crisis|assassin|dynasty|republic)/i,
  ],
]

const REGION_KEYWORDS: Array<[string, RegExp]> = [
  [
    'Mediterranean',
    /\b(alexandri|rome|roman|constantinople|byzant|greec|greek|carthage|egypt|ottoman)/i,
  ],
  ['East Asia', /\b(china|chinese|zheng he|ming|japan|korea|beijing)/i],
  ['South Asia', /\b(india|mughal|delhi|bengal)/i],
  ['Middle East', /\b(baghdad|persia|iran|mesopotam|levant|jerusalem|al-andalus|andalus)/i],
  [
    'Europe',
    /\b(europe|london|paris|mainz|vienna|germany|france|england|spain|italy|russia|1848)/i,
  ],
  ['North America', /\b(america|united states|usa|apollo|nasa|mexico)/i],
  ['Africa', /\b(africa|mali|ethiopia|congo|timbuktu)/i],
]

const TITLE_BANKS: Record<Mechanism, string[]> = {
  knowledge: ['The Unburnt Archive', 'The Long Library', 'A Republic of Letters'],
  disease: ['The Spared Generation', 'The Quiet Wards', 'A World Less Mourned'],
  politics: ['The Road Not Signed', 'A Crown Withheld', 'The Standing Wall'],
  technology: ['The Early Engine', 'The Patient Machine', 'Sparks Out of Season'],
  economics: ['The Other Ledger', 'Coin and Consequence', 'The Unbroken Exchange'],
  environment: ['The Sky That Held', 'A Kinder Season', 'The Unfallen Ash'],
  culture: ['The Second Canon', 'A Different Congregation', 'The Altered Chorus'],
}

const CONTEXT_CLAUSES: Record<Mechanism, string> = {
  knowledge: 'what was written and copied there set the ceiling on what later centuries could know',
  disease: 'sickness and its rumor governed cities more surely than any edict',
  politics: 'thrones, levies, and alliances were being renegotiated by force and marriage alike',
  technology: 'workshops and arsenals were quietly deciding which futures would be affordable',
  economics: 'credit, bullion, and grain moved along routes that empires only pretended to command',
  environment: 'harvests and weather set the real budget of every state',
  culture: 'belief and custom were the operating system of daily life',
}

/**
 * Deterministic pod intake for mock mode. Reads the freeform text with cheap
 * heuristics (year extraction incl. BC, mechanism and region keyword maps) so
 * that *arbitrary* user PODs work end to end without an API key.
 */
export function mockPodNormalize(rawArgs: unknown, rng: Rng): PodNormalizedOut {
  const { raw } = rawArgs as PodNormalizeArgs
  const text = raw.trim()

  const yearMatch = text.match(/\b(\d{1,4})\s*(BC|BCE)?\b/i)
  let year: number
  if (yearMatch?.[1]) {
    const n = Number(yearMatch[1])
    year = yearMatch[2] ? -n : n
    if (year === 0) year = -1
  } else {
    year = rng.int(-500, 1950)
    if (year === 0) year = -1
  }

  const mechanism =
    MECHANISM_KEYWORDS.find(([, pattern]) => pattern.test(text))?.[0] ?? ('politics' as const)
  const region = REGION_KEYWORDS.find(([, pattern]) => pattern.test(text))?.[0] ?? 'the wider world'

  let statement = text
    .replace(/^\s*what\s+(would\s+have\s+happened\s+)?if\s+/i, '')
    .replace(/\?+\s*$/, '')
    .trim()
  if (statement.length === 0) statement = text
  statement = statement.charAt(0).toUpperCase() + statement.slice(1)
  if (!/[.!]$/.test(statement)) statement = `${statement}.`

  const yearLabel = year < 0 ? `${Math.abs(year)} BC` : String(year)
  const titles = TITLE_BANKS[mechanism]

  return {
    statement,
    year,
    dateLabel: yearLabel,
    region,
    mechanism,
    baselineContext: `In the attested record of ${yearLabel}, ${region === 'the wider world' ? 'the world' : region} stood at a hinge: ${CONTEXT_CLAUSES[mechanism]}. The divergence departs from that settled course.`,
    suggestedTitle: rng.pick(titles),
  }
}
