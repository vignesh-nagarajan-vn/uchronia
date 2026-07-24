import { describe, expect, it } from 'vitest'
import { anchorsNear, loadBaseline } from './baseline.js'

describe('anchorsNear', () => {
  it('returns anchors inside the window, nearest first, when no region is given', () => {
    const anchors = anchorsNear(1450, 30)
    expect(anchors.length).toBeGreaterThan(0)
    for (const a of anchors) expect(Math.abs(a.year - 1450)).toBeLessThanOrEqual(30)
    const distances = anchors.map((a) => Math.abs(a.year - 1450))
    expect(distances).toEqual([...distances].sort((x, y) => x - y))
  })

  it('ranks same-theatre anchors ahead of other regions for a regional POD', () => {
    // A wide modern window holds anchors from many regions; a Mediterranean
    // POD must see Mediterranean (and global) anchors before East Asian ones.
    const anchors = anchorsNear(1500, 120, { region: 'Mediterranean' })
    const firstFar = anchors.findIndex(
      (a) => a.region === 'East Asia' || a.region === 'North America',
    )
    const lastNear = anchors
      .map((a, i) => (a.region === 'Mediterranean' ? i : -1))
      .reduce((max, i) => Math.max(max, i), -1)
    expect(lastNear).toBeGreaterThanOrEqual(0)
    if (firstFar !== -1) expect(lastNear).toBeLessThan(firstFar)
  })

  it('keeps off-region anchors in the tail instead of dropping them', () => {
    const plain = anchorsNear(1900, 40)
    const regional = anchorsNear(1900, 40, { region: 'Oceania' })
    expect(regional.length).toBe(plain.length)
  })

  it('treats a global POD as at home in every theatre', () => {
    const plain = anchorsNear(1800, 50).map((a) => a.id)
    const global = anchorsNear(1800, 50, { region: 'the wider world' }).map((a) => a.id)
    expect(global).toEqual(plain)
  })

  it('applies the limit after ranking', () => {
    const limited = anchorsNear(1500, 120, { region: 'Mediterranean', limit: 5 })
    expect(limited.length).toBeLessThanOrEqual(5)
    const unlimited = anchorsNear(1500, 120, { region: 'Mediterranean' })
    expect(limited).toEqual(unlimited.slice(0, 5))
  })

  it('loads a curated dataset with regions the ranking knows about', () => {
    const regions = new Set(loadBaseline().anchors.map((a) => a.region))
    expect(regions.has('Mediterranean')).toBe(true)
    expect(regions.has('the wider world')).toBe(true)
  })
})
