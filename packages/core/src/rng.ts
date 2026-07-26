/**
 * Deterministic randomness for the engine.
 *
 * The core never calls Math.random directly - every consumer receives an Rng
 * through injection (§6: IO only through injected ports). MockProvider seeds
 * one of these from its inputs so identical requests always produce identical
 * fixtures, which is what makes mock mode testable and CI stable.
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number
  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number
  /** Pick one element. Throws on empty input. */
  pick<T>(items: readonly T[]): T
}

/** FNV-1a 32-bit hash - stable, dependency-free seed derivation from strings. */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32 - small, fast, deterministic PRNG. */
export function seededRng(seed: number | string): Rng {
  let state = typeof seed === 'string' ? fnv1a(seed) : seed >>> 0
  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1))
    },
    pick(items) {
      const item = items[Math.floor(next() * items.length)]
      if (item === undefined && items.length === 0) {
        throw new Error('cannot pick from an empty list')
      }
      return item as (typeof items)[number]
    },
  }
}
