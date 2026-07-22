import { describe, expect, it } from 'vitest'
import { eraBatchSize, planEraSpans } from './plan.js'

describe('planEraSpans', () => {
  it('covers the horizon exactly, widening as it goes', () => {
    const spans = planEraSpans(-48, -48 + 150)
    expect(spans[0]).toEqual({ startYear: -48, endYear: -46 }) // 2y seed window
    expect(spans.at(-1)?.endYear).toBe(102)
    // Contiguous, non-overlapping.
    for (let i = 1; i < spans.length; i++) {
      expect(spans[i]?.startYear).toBe(spans[i - 1]?.endYear)
    }
    // Widening (except the clipped last one).
    for (let i = 2; i < spans.length - 1; i++) {
      const prev = spans[i - 1]
      const cur = spans[i]
      if (prev && cur) {
        expect(cur.endYear - cur.startYear).toBeGreaterThan(prev.endYear - prev.startYear)
      }
    }
    expect(spans.length).toBeGreaterThanOrEqual(5)
    expect(spans.length).toBeLessThanOrEqual(8)
  })

  it('handles millennial horizons without exploding the era count', () => {
    const spans = planEraSpans(-48, -48 + 2100)
    expect(spans.at(-1)?.endYear).toBe(2052)
    expect(spans.length).toBeLessThanOrEqual(14)
  })

  it('returns empty for empty horizons', () => {
    expect(planEraSpans(100, 100)).toEqual([])
  })
})

describe('eraBatchSize', () => {
  it('grows with distance and caps', () => {
    expect(eraBatchSize(0)).toBe(4)
    expect(eraBatchSize(45)).toBe(5)
    expect(eraBatchSize(500)).toBe(7)
  })
})
