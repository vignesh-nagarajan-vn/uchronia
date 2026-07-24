import type { Dial } from '@uchronia/schemas'

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

export function dialParams(dial: Dial): DialParams {
  const r = dial / 100
  const band: DialBand = dial < 34 ? 'butterfly' : dial <= 66 ? 'balanced' : 'railroad'

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
    // Near the POD everything is disciplined; decades out, low dials breathe.
    wildcardBudget: (distanceYears: number) => {
      const distanceFactor = Math.min(1, distanceYears / 60)
      const maxWild = lerp(3, 0.4, r)
      return Math.round(maxWild * distanceFactor)
    },
    wildcardPlausibilityFloor: lerp(0.15, 0.45, r),
    convergencePressure: r,
    attractorLanguage,
    voiceLanguage,
  }
}
