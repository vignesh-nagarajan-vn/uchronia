import { describe, expect, it } from 'vitest'
import { fnv1a, seededRng } from './rng.js'

describe('seededRng', () => {
  it('is deterministic for equal seeds', () => {
    const a = seededRng('library-of-alexandria')
    const b = seededRng('library-of-alexandria')
    const seqA = Array.from({ length: 20 }, () => a.next())
    const seqB = Array.from({ length: 20 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('diverges for different seeds', () => {
    const a = seededRng('constantinople-1453')
    const b = seededRng('gutenberg-suppressed')
    expect(a.next()).not.toBe(b.next())
  })

  it('int stays within inclusive bounds', () => {
    const rng = seededRng(42)
    for (let i = 0; i < 200; i++) {
      const n = rng.int(3, 7)
      expect(n).toBeGreaterThanOrEqual(3)
      expect(n).toBeLessThanOrEqual(7)
    }
  })

  it('pick returns members and throws on empty', () => {
    const rng = seededRng(7)
    const pool = ['a', 'b', 'c'] as const
    for (let i = 0; i < 50; i++) {
      expect(pool).toContain(rng.pick(pool))
    }
    expect(() => rng.pick([])).toThrow()
  })

  it('fnv1a is stable', () => {
    expect(fnv1a('uchronia')).toBe(fnv1a('uchronia'))
    expect(fnv1a('uchronia')).not.toBe(fnv1a('utopia'))
  })
})
