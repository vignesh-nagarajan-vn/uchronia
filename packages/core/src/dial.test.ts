import type { DialAxes } from '@uchronia/schemas'
import { describe, expect, it } from 'vitest'
import { deriveAxes, dialParams } from './dial.js'

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

describe('dial axes (v2/M17)', () => {
  const axes = (over: Partial<DialAxes> = {}): DialAxes => ({
    greatPersonWeight: 50,
    techVolatility: 50,
    culturalDrift: 50,
    chaosEvents: false,
    ...over,
  })

  it('derives every axis from the master dial when none are given', () => {
    expect(deriveAxes(20)).toEqual({
      greatPersonWeight: 80,
      techVolatility: 80,
      culturalDrift: 80,
      chaosEvents: true,
    })
    expect(deriveAxes(90).chaosEvents).toBe(false)
    expect(dialParams(20).axes).toEqual(deriveAxes(20))
  })

  it('uses explicit axes verbatim instead of the derived ones', () => {
    const explicit = axes({ greatPersonWeight: 5 })
    expect(dialParams(20, explicit).axes).toEqual(explicit)
  })

  it('widens the wildcard envelope for volatile technology and for chaos', () => {
    const distance = 60
    const flat = dialParams(50, axes()).wildcardBudget(distance)
    const volatile = dialParams(50, axes({ techVolatility: 90 })).wildcardBudget(distance)
    const chaotic = dialParams(50, axes({ chaosEvents: true })).wildcardBudget(distance)
    expect(volatile).toBeGreaterThan(flat)
    expect(chaotic).toBeGreaterThan(flat)
  })

  it('says nothing about axes sitting at their defaults, and speaks when they move', () => {
    expect(dialParams(50, axes()).axesLanguage).toBe('')
    const loud = dialParams(50, axes({ greatPersonWeight: 90, culturalDrift: 10 })).axesLanguage
    expect(loud).toMatch(/individuals genuinely bend/i)
    expect(loud).toMatch(/belief and custom hold fast/i)
  })

  it('notices when the reader silenced the shocks a butterfly dial would have brought', () => {
    expect(dialParams(20, axes({ chaosEvents: false })).axesLanguage).toMatch(
      /no external shocks intrude/i,
    )
    expect(dialParams(90, axes({ chaosEvents: false })).axesLanguage).not.toMatch(
      /no external shocks intrude/i,
    )
  })
})
