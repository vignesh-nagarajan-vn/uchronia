import { describe, expect, it } from 'vitest'
import { DEFAULT_LENSES, LENSES, Lens } from './lens.js'

describe('Lens', () => {
  it('accepts every declared lens', () => {
    for (const lens of LENSES) {
      expect(Lens.parse(lens)).toBe(lens)
    }
  })

  it('rejects unknown lenses', () => {
    expect(() => Lens.parse('military')).toThrow()
  })

  it('leaves philology filterable but off by default (v2/M18)', () => {
    // Every lens must be a real lens, and the default set must be a strict
    // subset: a chronicle that switched philology on everywhere would promise
    // a register most eras never speak in.
    expect(LENSES).toContain('philology')
    expect(DEFAULT_LENSES).not.toContain('philology')
    expect(DEFAULT_LENSES).toHaveLength(LENSES.length - 1)
    for (const lens of DEFAULT_LENSES) expect(LENSES).toContain(lens)
  })
})
