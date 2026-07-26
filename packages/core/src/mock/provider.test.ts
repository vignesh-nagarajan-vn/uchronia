import { PodNormalizedOut } from '@uchronia/schemas'
import { describe, expect, it } from 'vitest'
import { generateStructured } from '../pipeline/structured.js'
import { podNormalize } from '../prompts/pod-normalize.js'
import { MockProvider } from './provider.js'

describe('MockProvider - pod-normalize', () => {
  it('is deterministic for identical input', async () => {
    const a = await generateStructured(new MockProvider(), podNormalize, {
      raw: 'What if the Library of Alexandria never burned?',
    })
    const b = await generateStructured(new MockProvider(), podNormalize, {
      raw: 'What if the Library of Alexandria never burned?',
    })
    expect(a.value).toEqual(b.value)
    expect(a.mode).toBe('mock')
  })

  it('reads years, BC years, mechanisms, and regions from the text', async () => {
    const out = (
      await generateStructured(new MockProvider(), podNormalize, {
        raw: 'The Library of Alexandria never burns in 48 BC',
      })
    ).value
    expect(out.year).toBe(-48)
    expect(out.mechanism).toBe('knowledge')
    expect(out.region).toBe('Mediterranean')
    expect(out.dateLabel).toBe('48 BC')

    const zheng = (
      await generateStructured(new MockProvider(), podNormalize, {
        raw: "Zheng He's fleets are never scrapped after 1433",
      })
    ).value
    expect(zheng.year).toBe(1433)
    expect(zheng.region).toBe('East Asia')
  })

  it('turns questions into declarative statements', async () => {
    const out = (
      await generateStructured(new MockProvider(), podNormalize, {
        raw: 'what if the 1848 revolutions succeeded?',
      })
    ).value
    expect(out.statement).toBe('The 1848 revolutions succeeded.')
    expect(out.statement.endsWith('?')).toBe(false)
  })

  it('handles text with no year at all, deterministically', async () => {
    const raw = 'A world where the horse was never domesticated'
    const a = (await generateStructured(new MockProvider(), podNormalize, { raw })).value
    const b = (await generateStructured(new MockProvider(), podNormalize, { raw })).value
    expect(a.year).toBe(b.year)
    expect(PodNormalizedOut.parse(a)).toBeTruthy()
  })

  it('throws a typed error for unknown templates', async () => {
    const provider = new MockProvider()
    await expect(
      provider.complete({
        templateId: 'no-such-template',
        templateVersion: '1.0.0',
        role: 'utility',
        system: '',
        prompt: '',
        schemaName: 'X',
        schema: PodNormalizedOut,
        maxTokens: 10,
        args: {},
        seedKey: 'x',
      }),
    ).rejects.toThrow(/no handler/)
  })
})
