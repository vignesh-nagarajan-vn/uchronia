import { describe, expect, it } from 'vitest'
import { approximateThreadLength, computeThreadPath, threadSag } from './thread-geometry.js'

describe('thread geometry', () => {
  it('bulges left of both pins', () => {
    const path = computeThreadPath({ x: 100, y: 40 }, { x: 100, y: 400 })
    const xs = [...path.matchAll(/(-?\d+(?:\.\d+)?)\s+-?\d+(?:\.\d+)?/g)].map((m) => Number(m[1]))
    expect(Math.min(...xs)).toBeLessThan(100)
    expect(path.startsWith('M 100 40')).toBe(true)
    expect(path.endsWith('100 400')).toBe(true)
  })

  it('sags more for longer spans and deeper nesting', () => {
    expect(threadSag(600)).toBeGreaterThan(threadSag(60))
    expect(threadSag(200, 2)).toBeGreaterThan(threadSag(200, 0))
    expect(threadSag(10000)).toBeLessThanOrEqual(72 + 0) // capped
  })

  it('is symmetric for up- and downward threads', () => {
    expect(threadSag(-300)).toBe(threadSag(300))
  })

  it('length approximation grows with span', () => {
    const short = approximateThreadLength({ x: 0, y: 0 }, { x: 0, y: 100 })
    const long = approximateThreadLength({ x: 0, y: 0 }, { x: 0, y: 800 })
    expect(long).toBeGreaterThan(short)
  })
})
