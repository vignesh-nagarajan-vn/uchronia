import { PodInterpretedOut, PodNormalizedOut } from '@uchronia/schemas'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { loadBaseline } from './baseline.js'
import { mockPodInterpret } from './mock/pod-interpret.js'
import { mockPodNormalize } from './mock/pod-normalize.js'
import { parseYearFromText, sketchPod } from './pod-sketch.js'
import { seededRng } from './rng.js'

/**
 * Property tests (v2/M15): arbitrary garbage through demo intake never throws
 * and always yields schema-valid output. The 100-run default per property is
 * deliberate: these run in CI on every push.
 */
describe('demo intake under fuzz', () => {
  const anchors = loadBaseline().anchors

  it('mockPodNormalize never throws and always satisfies its schema', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 300 }), (raw) => {
        const rng = seededRng(`fuzz:${raw}`)
        const out = mockPodNormalize({ raw }, rng)
        expect(() => PodNormalizedOut.parse(out)).not.toThrow()
      }),
    )
  })

  it('mockPodInterpret never throws and always satisfies its schema', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 300 }), (raw) => {
        const rng = seededRng(`fuzz:${raw}`)
        const out = mockPodInterpret({ raw, anchors: [] }, rng)
        expect(() => PodInterpretedOut.parse(out)).not.toThrow()
      }),
    )
  })

  it('sketchPod and parseYearFromText total over arbitrary unicode', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 500, unit: 'binary' }), (raw) => {
        const year = parseYearFromText(raw)
        if (year !== null) expect(Number.isInteger(year)).toBe(true)
        const sketch = sketchPod(raw, anchors)
        expect(['explicit', 'alias', 'anchor', 'none']).toContain(sketch.yearSource)
      }),
    )
  })
})
