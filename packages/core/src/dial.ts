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
  }
}
