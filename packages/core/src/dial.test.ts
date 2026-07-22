import { describe, expect, it } from 'vitest'
import { dialParams } from './dial.js'

describe('dialParams', () => {
  it('maps dial positions to bands', () => {
    expect(dialParams(0).band).toBe('butterfly')
    expect(dialParams(33).band).toBe('butterfly')
    expect(dialParams(34).band).toBe('balanced')
    expect(dialParams(66).band).toBe('balanced')
    expect(dialParams(67).band).toBe('railroad')
    expect(dialParams(100).band).toBe('railroad')
  })

  it('gives butterfly histories a bigger wildcard budget than railroads', () => {
    const butterfly = dialParams(0)
    const railroad = dialParams(100)
    expect(butterfly.wildcardBudget(60)).toBeGreaterThan(railroad.wildcardBudget(60))
    expect(railroad.wildcardBudget(60)).toBeLessThanOrEqual(1)
  })

  it('disciplines wildcards near the POD regardless of dial', () => {
    expect(dialParams(0).wildcardBudget(0)).toBe(0)
    expect(dialParams(0).wildcardBudget(2)).toBeLessThanOrEqual(1)
  })

  it('raises the wildcard plausibility floor with the dial', () => {
    expect(dialParams(0).wildcardPlausibilityFloor).toBeCloseTo(0.15)
    expect(dialParams(100).wildcardPlausibilityFloor).toBeCloseTo(0.45)
    expect(dialParams(50).wildcardPlausibilityFloor).toBeCloseTo(0.3)
  })

  it('exposes convergence pressure as railroadness', () => {
    expect(dialParams(80).convergencePressure).toBeCloseTo(0.8)
  })

  it('embeds the dial value in the attractor language', () => {
    expect(dialParams(72).attractorLanguage).toContain('72/100')
  })
})
