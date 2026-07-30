import { PodInterpretedOut } from '@uchronia/schemas'
import { describe, expect, it } from 'vitest'
import { podInterpret } from '../prompts/pod-interpret.js'
import { buildRequest } from '../prompts/types.js'
import { MockProvider } from './provider.js'

async function interpret(raw: string) {
  const provider = new MockProvider()
  const result = await provider.complete(buildRequest(podInterpret, { raw, anchors: [] }))
  return PodInterpretedOut.parse(result.value)
}

describe('mock pod-interpret (v2/M14) - demo intake that never embarrasses itself', () => {
  it('passes the demo WW2 gate: 1939-1945, real candidate mechanisms, schema-valid', async () => {
    const out = await interpret('What if the Allies lost World War 2')
    expect(out.year).toBeGreaterThanOrEqual(1939)
    expect(out.year).toBeLessThanOrEqual(1945)
    expect(out.region).toBe('Europe')
    expect(out.mechanism).toBe('politics')
    expect(out.candidates.length).toBeGreaterThanOrEqual(2)
    expect(out.candidates.map((c) => c.label)).toContain('Operation Sea Lion succeeds')
    expect(out.confidence).toBeGreaterThanOrEqual(0.55)
    expect(out.clarifyingQuestion).toBeNull()
    expect(out.statement).toContain('Allies')
  })

  it('offers anchor-grounded candidates for unnamed asks', async () => {
    const out = await interpret('What if Constantinople held against the siege in 1453')
    expect(out.year).toBe(1453)
    expect(out.candidates.length).toBeGreaterThanOrEqual(1)
  })

  it('answers garbage with low confidence and one clarifying question at most', async () => {
    const out = await interpret('zzz qqq xyzzy plugh')
    expect(out.confidence).toBeLessThan(0.55)
    expect(out.ambiguities.length).toBeGreaterThan(0)
    // A clarifying question needs at least two real options; with none, null is honest.
    if (out.clarifyingQuestion) {
      expect(out.clarifyingQuestion.options.length).toBeGreaterThanOrEqual(2)
    }
    // Never a random century: the fallback is fixed and modern.
    expect(out.year).toBe(1900)
  })

  it('is deterministic per input', async () => {
    const a = await interpret('What if the Allies lost World War 2')
    const b = await interpret('What if the Allies lost World War 2')
    expect(a).toEqual(b)
  })
})
