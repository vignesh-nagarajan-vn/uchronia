import type { BaselineAnchor, Lens, Mechanism, PodCandidate } from '@uchronia/schemas'
import { keywordScore, tokenize } from './retrieval.js'

/**
 * Deterministic intake heuristics (v2/M14), shared by the demo engine and by
 * server-side retrieval biasing. This module is why "What if the Allies lost
 * World War 2" lands in 1939-1945 instead of a random century: named-event
 * aliases snap to the right years with real candidate mechanisms, year
 * parsing requires an actual year (3-4 digits, or 1-4 with an era marker),
 * and the last resort is the nearest curated anchor - never a dice roll.
 */

export interface PodSketch {
  year: number | null
  yearSource: 'explicit' | 'alias' | 'anchor' | 'none'
  region: string | null
  mechanism: Mechanism | null
  /** Canned, historically real candidate mechanisms when a named event matched. */
  aliasCandidates: PodCandidate[] | null
  /** The alias's human label ("the Second World War"), when one matched. */
  aliasLabel: string | null
  /** Best keyword-matched anchor, when one scored. */
  matchedAnchor: BaselineAnchor | null
}

interface EventAlias {
  pattern: RegExp
  label: string
  year: number
  region: string
  mechanism: Mechanism
  /** Canned candidate mechanisms; aliases without them get anchor-built ones. */
  candidates?: PodCandidate[]
}

/**
 * Named events users type instead of years. Ordered: earlier entries win
 * (WW2 patterns sit before WW1 so "world war two" never half-matches).
 * Candidates are the real hinges historians argue about.
 */
export const EVENT_ALIASES: readonly EventAlias[] = [
  {
    pattern: /\b(ww\s?2|ww\s?ii|world war (2|ii|two)|second world war)\b/i,
    label: 'the Second World War',
    year: 1939,
    region: 'Europe',
    mechanism: 'politics',
    candidates: [
      {
        label: 'Operation Sea Lion succeeds',
        year: 1940,
        dateLabel: 'September 1940',
        region: 'Europe',
        mechanism: 'politics',
        rationale:
          'The air battle over Britain goes the other way and the invasion lands, removing the western base for any later liberation.',
      },
      {
        label: 'Moscow falls in the winter of 1941',
        year: 1941,
        dateLabel: 'December 1941',
        region: 'Europe',
        mechanism: 'politics',
        rationale:
          'Barbarossa reaches its objective before the Soviet counteroffensive can form, breaking the eastern front at its hinge.',
      },
      {
        label: 'No attack on Pearl Harbor',
        year: 1941,
        dateLabel: 'December 1941',
        region: 'East Asia',
        mechanism: 'politics',
        rationale:
          'Japan strikes south without touching the American fleet, and the United States stays out of the European war for years.',
      },
      {
        label: 'A German atomic bomb arrives first',
        year: 1944,
        dateLabel: '1944',
        region: 'Europe',
        mechanism: 'technology',
        rationale:
          'The Uranverein escapes its dead ends years early and the balance of terror inverts before the Allies can answer.',
      },
    ],
  },
  {
    pattern: /\b(ww\s?1|ww\s?i|world war (1|i|one)|first world war|great war)\b/i,
    label: 'the First World War',
    year: 1914,
    region: 'Europe',
    mechanism: 'politics',
    candidates: [
      {
        label: 'The July Crisis is defused',
        year: 1914,
        dateLabel: 'July 1914',
        region: 'Europe',
        mechanism: 'politics',
        rationale: 'The machinery of alliance stalls at the brink and the war never begins at all.',
      },
      {
        label: 'The Schlieffen advance takes Paris',
        year: 1914,
        dateLabel: 'September 1914',
        region: 'Europe',
        mechanism: 'politics',
        rationale: 'No miracle on the Marne: the western war ends in weeks, not years.',
      },
      {
        label: 'America stays neutral through 1918',
        year: 1917,
        dateLabel: 'April 1917',
        region: 'Europe',
        mechanism: 'politics',
        rationale:
          'Without American weight the exhausted fronts settle into a negotiated peace of mutual ruin.',
      },
    ],
  },
  {
    pattern: /\bcold war\b/i,
    label: 'the Cold War',
    year: 1947,
    region: 'the wider world',
    mechanism: 'politics',
    candidates: [
      {
        label: 'The Berlin blockade turns hot',
        year: 1948,
        dateLabel: 'summer 1948',
        region: 'Europe',
        mechanism: 'politics',
        rationale: 'The airlift is contested in the air and the occupation zones become a front.',
      },
      {
        label: 'The Cuban crisis escalates',
        year: 1962,
        dateLabel: 'October 1962',
        region: 'North America',
        mechanism: 'politics',
        rationale:
          'A depth-charged submarine answers back and the ladder of escalation is climbed.',
      },
      {
        label: 'No division of Europe at all',
        year: 1945,
        dateLabel: '1945',
        region: 'Europe',
        mechanism: 'politics',
        rationale:
          'The wartime alliance holds into the peace and the continent is administered jointly.',
      },
    ],
  },
  {
    pattern: /\b(american civil war|confederacy|confederate states)\b/i,
    label: 'the American Civil War',
    year: 1861,
    region: 'North America',
    mechanism: 'politics',
    candidates: [
      {
        label: 'Antietam goes the other way',
        year: 1862,
        dateLabel: 'September 1862',
        region: 'North America',
        mechanism: 'politics',
        rationale:
          'The lost orders stay lost, the invasion of Maryland succeeds, and European recognition follows.',
      },
      {
        label: 'Britain recognizes the Confederacy',
        year: 1862,
        dateLabel: '1862',
        region: 'North America',
        mechanism: 'politics',
        rationale:
          'The cotton interest outweighs the anti-slavery public and the blockade faces the Royal Navy.',
      },
      {
        label: 'The secession crisis is compromised away',
        year: 1861,
        dateLabel: 'early 1861',
        region: 'North America',
        mechanism: 'politics',
        rationale:
          'A Crittenden-style bargain postpones the war and lets the institution rot slower.',
      },
    ],
  },
  {
    pattern: /\b(operation sea ?lion|sealion)\b/i,
    label: 'Operation Sea Lion',
    year: 1940,
    region: 'Europe',
    mechanism: 'politics',
  },
  {
    pattern: /\bpearl harbor\b/i,
    label: 'the attack on Pearl Harbor',
    year: 1941,
    region: 'East Asia',
    mechanism: 'politics',
  },
  {
    pattern: /\b(d-day|normandy landings?|operation overlord)\b/i,
    label: 'the Normandy landings',
    year: 1944,
    region: 'Europe',
    mechanism: 'politics',
  },
  {
    pattern: /\b(hiroshima|nagasaki)\b/i,
    label: 'the atomic bombings of 1945',
    year: 1945,
    region: 'East Asia',
    mechanism: 'technology',
  },
  {
    pattern: /\bblack death\b/i,
    label: 'the Black Death',
    year: 1347,
    region: 'Europe',
    mechanism: 'disease',
  },
  {
    pattern: /\bfall of rome\b|\brome (never )?f[ae]ll\b/i,
    label: 'the fall of the western empire',
    year: 476,
    region: 'Mediterranean',
    mechanism: 'politics',
  },
  {
    pattern: /\bamerican revolution\b/i,
    label: 'the American Revolution',
    year: 1775,
    region: 'North America',
    mechanism: 'politics',
  },
  {
    pattern: /\b(russian revolution|october revolution|bolshevik)\b/i,
    label: 'the Russian Revolution',
    year: 1917,
    region: 'Europe',
    mechanism: 'politics',
  },
  {
    pattern: /\bindustrial revolution\b/i,
    label: 'the Industrial Revolution',
    year: 1760,
    region: 'Europe',
    mechanism: 'technology',
  },
  {
    pattern: /\b(moon landing|apollo 11)\b/i,
    label: 'the first Moon landing',
    year: 1969,
    region: 'North America',
    mechanism: 'technology',
  },
  {
    pattern: /\b(spanish armada|armada invencible)\b/i,
    label: 'the Spanish Armada',
    year: 1588,
    region: 'Europe',
    mechanism: 'politics',
  },
  {
    pattern: /\bfrench revolution\b/i,
    label: 'the French Revolution',
    year: 1789,
    region: 'Europe',
    mechanism: 'politics',
    candidates: [
      {
        label: 'The Estates-General finds a constitutional settlement',
        year: 1789,
        dateLabel: 'summer 1789',
        region: 'Europe',
        mechanism: 'politics',
        rationale: 'The fiscal crisis is resolved by a British-style compact instead of a rupture.',
      },
      {
        label: 'The flight to Varennes succeeds',
        year: 1791,
        dateLabel: 'June 1791',
        region: 'Europe',
        mechanism: 'politics',
        rationale:
          'The king reaches loyal troops and the revolution faces a royalist rallying point abroad.',
      },
      {
        label: 'No revolution: the debt is restructured in 1787',
        year: 1787,
        dateLabel: '1787',
        region: 'Europe',
        mechanism: 'economics',
        rationale:
          'The Assembly of Notables accepts land-tax reform and the monarchy limps on solvent.',
      },
    ],
  },
]

export const MECHANISM_KEYWORDS: ReadonlyArray<[Mechanism, RegExp]> = [
  [
    'knowledge',
    /\b(librar|book|scroll|manuscript|archive|scholar|alexandri|print|gutenberg|encyclopedi)/i,
  ],
  ['disease', /\b(plague|disease|pandemic|epidemic|pox|influenza|penicillin|vaccine|cholera)/i],
  [
    'technology',
    /\b(engine|steam|machine|invention|process|haber|apollo|rocket|electri|telegraph|computer|fleet|flight|flyer|aviation|aircraft|airplane|wright|automobile|railway|railroad|radio|transistor|internet|atomic|nuclear|radar)/i,
  ],
  ['economics', /\b(trade|bank|market|coin|currency|tax|merchant|silk road|economic|depression)/i],
  ['environment', /\b(storm|climate|volcan|drought|flood|earthquake|carrington|famine|harvest)/i],
  ['culture', /\b(religio|church|faith|art|music|language|reformation|philosoph|school)/i],
  [
    'politics',
    /\b(war|battle|siege|treaty|empire|king|queen|emperor|revolution|crisis|assassin|dynasty|republic|allies|allied|axis|nazi|hitler|stalin|churchill|roosevelt|soviet|reich|invasion|blitz|front)/i,
  ],
]

export const REGION_KEYWORDS: ReadonlyArray<[string, RegExp]> = [
  [
    'Mediterranean',
    /\b(alexandri|rome|roman|constantinople|byzant|greec|greek|carthage|egypt|ottoman|caesar|rubicon|actium|ides of march)/i,
  ],
  [
    'East Asia',
    /\b(china|chinese|zheng he|ming|japan|japanese|korea|beijing|tokyo|pacific|pearl harbor|midway|okinawa|iwo jima)/i,
  ],
  ['South Asia', /\b(india|mughal|delhi|bengal)/i],
  ['Middle East', /\b(baghdad|persia|iran|mesopotam|levant|jerusalem|al-andalus|andalus)/i],
  [
    'Europe',
    /\b(europe|london|paris|mainz|vienna|germany|german|france|french|england|british|britain|spain|italy|russia|soviet|moscow|berlin|stalingrad|normandy|nazi|reich|1848)/i,
  ],
  [
    'North America',
    /\b(america|american|united states|usa|washington|apollo|nasa|mexico|kitty hawk|wright|carolina|canada|confedera)/i,
  ],
  ['Africa', /\b(africa|mali|ethiopia|congo|timbuktu)/i],
]

/**
 * Parse an actual year from freeform text. Bare numbers must be 3-4 digits
 * (so "World War 2" never reads as year 2); 1-2 digit years need an explicit
 * era marker (48 BC, AD 79). Decades ("the 1930s") yield their opening year.
 * Returns the first match; null when the text carries no year at all.
 */
export function parseYearFromText(text: string): number | null {
  const bc = text.match(/(?<!\d)(\d{1,4})\s*(?:BC|BCE)\b/i)
  if (bc?.[1]) {
    const n = Number(bc[1])
    return n === 0 ? -1 : -n
  }
  const markedAd =
    text.match(/\b(?:AD|CE)\s*(\d{1,4})(?!\d)/i) ?? text.match(/(?<!\d)(\d{1,4})\s*(?:AD|CE)\b/)
  if (markedAd?.[1]) {
    const n = Number(markedAd[1])
    return n === 0 ? 1 : n
  }
  // Prefer 4-digit years over 3-digit ones anywhere in the text, so
  // "300 ships sail in 1492" reads 1492, while "Rome falls in 476" still works.
  const bare4 = text.match(/(?<!\d)(\d{4})(?!\d)/)
  if (bare4?.[1]) {
    const n = Number(bare4[1])
    if (n <= 2200) return n
  }
  const bare3 = text.match(/(?<!\d)(\d{3})(?!\d)/)
  if (bare3?.[1]) {
    const n = Number(bare3[1])
    if (n >= 100) return n
  }
  return null
}

/** Anchor lens → the mechanism it most plausibly diverges through. */
const LENS_MECHANISM: Record<Lens, Mechanism> = {
  political: 'politics',
  technological: 'technology',
  cultural: 'culture',
  economic: 'economics',
  'daily-life': 'culture',
}

/**
 * Read freeform POD text against the curated record. Priority: explicit year
 * beats alias year beats anchor-snapped year; mechanism and region come from
 * keywords, then the alias, then the matched anchor. The random-year fallback
 * of v1 is dead: with no signal at all, everything stays null and the caller
 * chooses its own honest default.
 */
export function sketchPod(text: string, anchors: readonly BaselineAnchor[]): PodSketch {
  const alias = EVENT_ALIASES.find((a) => a.pattern.test(text)) ?? null
  const explicitYear = parseYearFromText(text)

  const keywordMechanism = MECHANISM_KEYWORDS.find(([, pattern]) => pattern.test(text))?.[0] ?? null
  const keywordRegion = REGION_KEYWORDS.find(([, pattern]) => pattern.test(text))?.[0] ?? null

  // Anchor snap: real keyword evidence only (threshold 3 = one specific title
  // word or accumulated corroboration) - a lone short common word or a bare
  // year never snaps.
  const tokens = tokenize(text)
  const yearHint = explicitYear ?? alias?.year ?? null
  let snapped: BaselineAnchor | null = null
  if (tokens.length > 0) {
    let bestScore = 0
    for (const anchor of anchors) {
      // A named year scopes the search: an anchor centuries away is noise
      // however well a common word ("march") happens to match its title.
      if (yearHint !== null && Math.abs(anchor.year - yearHint) > 150) continue
      const score = keywordScore(anchor, tokens)
      if (score === 0) continue
      // Equal evidence breaks toward the year hint when there is one, else
      // toward the later year: "Constantinople held" means the famous fall.
      const beatsTie =
        snapped !== null &&
        (yearHint !== null
          ? Math.abs(anchor.year - yearHint) < Math.abs(snapped.year - yearHint)
          : anchor.year > snapped.year)
      if (score > bestScore || (score === bestScore && beatsTie)) {
        bestScore = score
        snapped = anchor
      }
    }
    if (bestScore < 3) snapped = null
  }

  const year = explicitYear ?? alias?.year ?? snapped?.year ?? null
  const yearSource: PodSketch['yearSource'] =
    explicitYear !== null ? 'explicit' : alias ? 'alias' : snapped ? 'anchor' : 'none'

  const mechanism =
    keywordMechanism ??
    alias?.mechanism ??
    (snapped?.lenses[0] ? LENS_MECHANISM[snapped.lenses[0]] : null)
  const region = keywordRegion ?? alias?.region ?? snapped?.region ?? null

  return {
    year,
    yearSource,
    region,
    mechanism,
    aliasCandidates: alias?.candidates ?? null,
    aliasLabel: alias ? alias.label : null,
    matchedAnchor: snapped,
  }
}
