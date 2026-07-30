import type { Dial, DialAxes } from '@uchronia/schemas'

export type DialBand = 'butterfly' | 'balanced' | 'railroad'

/**
 * The determinism dial (§4.4), made concrete. One number, four effects:
 * (a) attractor-vs-contingency prompt language, (b) how many wildcard
 * candidates each era samples, (c) a convergence-pressure term fed to the
 * pressures step, (d) the plausibility floor below which wildcards are
 * discarded. The exact mapping is documented in docs/GENERATION.md.
 */
export interface DialParams {
  dial: Dial
  band: DialBand
  /** 0 = pure butterfly, 1 = pure railroad. */
  railroadness: number
  /** Wildcard candidates to request for a batch, given distance from the POD. */
  wildcardBudget: (distanceYears: number) => number
  /** Wildcards scoring below this are discarded before commit. */
  wildcardPlausibilityFloor: number
  /** 0–1 term the pressures step uses to pull toward baseline attractors. */
  convergencePressure: number
  /** Resolved axes (v2/M17): explicit values, or derived from the master. */
  axes: DialAxes
  /** Prompt language for the axes; empty when every axis sits at its default. */
  axesLanguage: string
  /** Prompt language describing how strongly attractors bind this history. */
  attractorLanguage: string
  /**
   * Prompt language for the prose register: the chronicle's nerves track the
   * dial. Off the rails (butterfly) the voice is allowed to fray; on rails
   * (railroad) it is a clerk who has seen the shape of things.
   */
  voiceLanguage: string
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * Axis defaults derive from the master dial (v2/M17): a butterfly history
 * lets great persons, technology, and culture swing; a railroad history
 * pins them all. Chaos shocks default on below the balanced midpoint.
 */
export function deriveAxes(dial: Dial): DialAxes {
  return {
    greatPersonWeight: 100 - dial,
    techVolatility: 100 - dial,
    culturalDrift: 100 - dial,
    chaosEvents: dial < 50,
  }
}

function axesLanguageFor(axes: DialAxes, derived: DialAxes): string {
  const lines: string[] = []
  const describe = (value: number, low: string, high: string): string | null =>
    value <= 33 ? low : value >= 67 ? high : null
  const gp = describe(
    axes.greatPersonWeight,
    'Individuals rarely bend this history: structures, offices, and demographics act; named persons mostly ride the current.',
    'Named individuals genuinely bend this history: a commander, an heir, an inventor can move outcomes structures would not.',
  )
  const tv = describe(
    axes.techVolatility,
    'Technology plods here: inventions arrive on schedule or late, diffuse slowly, and never leap a prerequisite.',
    'Technology is volatile here: lines of work leap ahead, stall for decades, or arrive from unexpected quarters (never absurdly early; prerequisites still bind).',
  )
  const cd = describe(
    axes.culturalDrift,
    'Belief and custom hold fast: faiths, tongues, and manners change on the scale of centuries.',
    'Belief and custom churn: movements, styles, and vocabularies shift within a generation, and the prose should notice.',
  )
  for (const line of [gp, tv, cd]) if (line) lines.push(line)
  if (!axes.chaosEvents && derived.chaosEvents) {
    lines.push(
      'No external shocks intrude uninvited: plagues, storms, and assassins stay offstage unless the pressures themselves produce them.',
    )
  }
  return lines.join(' ')
}

export function dialParams(dial: Dial, explicitAxes?: DialAxes): DialParams {
  const r = dial / 100
  const band: DialBand = dial < 34 ? 'butterfly' : dial <= 66 ? 'balanced' : 'railroad'
  const derived = deriveAxes(dial)
  const axes = explicitAxes ?? derived

  const attractorLanguage = {
    butterfly: `Contingency compounds in this history (determinism ${dial}/100). Small causes are allowed large descendants; do not steer outcomes back toward the familiar. Structural forces still exist, but they set costs, not destinations.`,
    balanced: `This history balances contingency against structure (determinism ${dial}/100). Let accidents matter, but let geography, demography, and economics collect their debts within a generation.`,
    railroad: `Structural attractors dominate this history (determinism ${dial}/100). Geography, demographics, and economics drag events back toward familiar channels; divergences bend the road, they rarely move the destination. Prefer consequences that rhyme with the attested record.`,
  }[band]

  const voiceLanguage = {
    butterfly: `The register of this chronicle (determinism ${dial}/100): history is off its rails here and the prose is allowed to show it. Entries can come clipped, or run on past where a calmer clerk would have stopped. An aside mid-sentence, a correction the writer did not go back to erase, a rumor kept because nobody could disprove it in time. The facts stay disciplined; the nerves show in the rhythm. Never let the wildness become nonsense, and never announce it. It leaks.`,
    balanced: `The register of this chronicle (determinism ${dial}/100): composed but not serene. Steady entries, an eyebrow raised where the sources disagree, the occasional dry aside a tired archivist could not resist. When something genuinely surprising lands, the sentence around it is allowed to tighten.`,
    railroad: `The register of this chronicle (determinism ${dial}/100): structure is winning and the voice knows it. Measured, ledgered, almost unhurried; a clerk who has seen the shape of things and files each event where it was always going to go. Any wildness belongs to the events. The sentences stay level even when the news is not.`,
  }[band]

  return {
    dial,
    band,
    railroadness: r,
    axes,
    axesLanguage: axesLanguageFor(axes, derived),
    // Near the POD everything is disciplined; decades out, low dials breathe.
    // The axes then claim WHOLE slots on top, not fractions: a reader who
    // dials technology volatile has to be able to see it happen, and a
    // fractional boost rounds away to nothing across most of the range.
    wildcardBudget: (distanceYears: number) => {
      const distanceFactor = Math.min(1, distanceYears / 60)
      const base = Math.round(lerp(3, 0.4, r) * distanceFactor)
      // Still nothing in the POD's first years, whatever the axes say (P2).
      if (distanceFactor < 0.5) return base
      const volatilitySlot = axes.techVolatility >= 67 ? 1 : 0
      const chaosSlot = axes.chaosEvents ? 1 : 0
      return base + volatilitySlot + chaosSlot
    },
    wildcardPlausibilityFloor: lerp(0.15, 0.45, r),
    convergencePressure: r,
    attractorLanguage,
    voiceLanguage,
  }
}
