import { describe, expect, it } from 'vitest'
import { LENSES, Lens } from './lens.js'

describe('Lens', () => {
  it('accepts every declared lens', () => {
    for (const lens of LENSES) {
      expect(Lens.parse(lens)).toBe(lens)
    }
  })

  it('rejects unknown lenses', () => {
    expect(() => Lens.parse('military')).toThrow()
  })
})
