import { ulid } from 'ulid'

/**
 * The engine performs no IO of its own (§6): time, identity, and randomness
 * arrive through these ports. `Rng` lives in rng.ts.
 */
export interface Clock {
  now(): Date
}

export interface IdGen {
  /** Mint one ULID. */
  next(): string
}

export const systemClock: Clock = {
  now: () => new Date(),
}

/** Production id generation — monotonic-ish real ULIDs. */
export function ulidIdGen(): IdGen {
  return { next: () => ulid() }
}

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/**
 * Deterministic ids for tests and mock runs: valid ULIDs from a two-char kind
 * code and an incrementing counter — stable across runs for identical inputs.
 */
export function sequentialIdGen(kindCode = 'MK', start = 0): IdGen {
  if (!/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{2}$/.test(kindCode)) {
    throw new Error(`kind code must be two ULID-alphabet chars, got ${kindCode}`)
  }
  let counter = start
  return {
    next() {
      let v = counter++
      let s = ''
      for (let i = 0; i < 22; i++) {
        s = ALPHABET[v % 32] + s
        v = Math.floor(v / 32)
      }
      return `01${kindCode}${s}`
    },
  }
}

/** Fixed clock for tests and mock provenance. */
export function fixedClock(iso: string): Clock {
  const d = new Date(iso)
  return { now: () => d }
}
