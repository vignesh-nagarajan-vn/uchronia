import { describe, expect, it } from 'vitest'
import { formatYear, formatYearRange } from './format.js'

describe('formatYear', () => {
  it('renders positive years bare', () => {
    expect(formatYear(1453)).toBe('1453')
    expect(formatYear(14)).toBe('14')
  })

  it('renders BC years with suffix', () => {
    expect(formatYear(-48)).toBe('48 BC')
    expect(formatYear(-1177)).toBe('1177 BC')
  })

  it('handles the missing year zero', () => {
    expect(formatYear(0)).toBe('1 BC')
  })

  it('handles non-finite input', () => {
    expect(formatYear(Number.NaN)).toBe('–')
  })
})

describe('formatYearRange', () => {
  it('joins with an en dash', () => {
    expect(formatYearRange(-48, 12)).toBe('48 BC – 12')
  })
})
