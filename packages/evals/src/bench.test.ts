import { describe, expect, it } from 'vitest'
import { BENCHMARK } from './bench.js'
import { runMockLane } from './mock-lane.js'

describe('the intake benchmark (v2/M15)', () => {
  it('spans the required breadth with 25+ PODs', () => {
    expect(BENCHMARK.length).toBeGreaterThanOrEqual(25)
    const tags = new Set(BENCHMARK.flatMap((p) => p.tags))
    for (const required of [
      'ww2',
      'modern',
      'ancient',
      'medieval',
      'early-modern',
      'obscure',
      'vague',
      'garbage',
      'non-english',
    ]) {
      expect(tags.has(required), required).toBe(true)
    }
    expect(new Set(BENCHMARK.map((p) => p.id)).size).toBe(BENCHMARK.length)
  })

  it('passes the mock lane end to end (the CI gate, also as a test)', async () => {
    const { results, failed } = await runMockLane()
    const failures = results
      .filter((r) => !r.ok)
      .map((r) => `${r.pod.id}: ${r.failures.join('; ')}`)
    expect(failures, failures.join(' | ')).toEqual([])
    expect(failed).toBe(0)
  })
})
