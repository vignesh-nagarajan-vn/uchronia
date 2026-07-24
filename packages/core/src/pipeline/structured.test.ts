import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { GenerationValidationError } from '../errors.js'
import type { LLMProvider, StructuredRequest, StructuredResult } from '../llm.js'
import type { PromptTemplate } from '../prompts/types.js'
import { generateStructured, scrubEmDashes } from './structured.js'

const Out = z.object({ answer: z.number().int() })

const template: PromptTemplate<{ q: string }, z.infer<typeof Out>> = {
  id: 'test-template',
  version: '1.0.0',
  changelog: ['1.0.0 — test'],
  role: 'utility',
  schemaName: 'Out',
  schema: Out,
  maxTokens: 100,
  system: () => 'system',
  prompt: ({ q }) => `Q: ${q}`,
}

function scriptedProvider(responses: unknown[]): LLMProvider & { requests: StructuredRequest[] } {
  const requests: StructuredRequest[] = []
  let i = 0
  return {
    mode: 'mock',
    requests,
    complete(request: StructuredRequest): Promise<StructuredResult> {
      requests.push(request)
      const value = responses[Math.min(i, responses.length - 1)]
      i++
      return Promise.resolve({
        value,
        raw: JSON.stringify(value) ?? 'not json',
        model: 'scripted',
        mode: 'mock',
      })
    },
  }
}

describe('generateStructured — bounded repair loop', () => {
  it('returns validated output on first success', async () => {
    const provider = scriptedProvider([{ answer: 42 }])
    const out = await generateStructured(provider, template, { q: 'meaning' })
    expect(out.value.answer).toBe(42)
    expect(provider.requests).toHaveLength(1)
  })

  it('repairs once with validation errors attached to the prompt', async () => {
    const provider = scriptedProvider([{ answer: 'forty-two' }, { answer: 42 }])
    const out = await generateStructured(provider, template, { q: 'meaning' })
    expect(out.value.answer).toBe(42)
    expect(provider.requests).toHaveLength(2)
    const repairPrompt = provider.requests[1]?.prompt ?? ''
    expect(repairPrompt).toContain('validation-errors')
    expect(repairPrompt).toContain('answer')
    // The repair keeps the original question too.
    expect(repairPrompt).toContain('Q: meaning')
  })

  it('fails loudly after two repairs', async () => {
    const provider = scriptedProvider([{ answer: 'a' }, { answer: 'b' }, { answer: 'c' }])
    await expect(generateStructured(provider, template, { q: 'meaning' })).rejects.toThrow(
      GenerationValidationError,
    )
    expect(provider.requests).toHaveLength(3)
  })

  it('treats non-JSON raw as a repairable failure', async () => {
    const provider: LLMProvider = {
      mode: 'mock',
      complete: (() => {
        let first = true
        return (_req: StructuredRequest): Promise<StructuredResult> => {
          if (first) {
            first = false
            return Promise.resolve({
              value: undefined,
              raw: 'I refuse to answer in JSON',
              model: 'x',
              mode: 'mock',
            })
          }
          return Promise.resolve({
            value: { answer: 7 },
            raw: '{"answer":7}',
            model: 'x',
            mode: 'mock',
          })
        }
      })(),
    }
    const out = await generateStructured(provider, template, { q: 'json please' })
    expect(out.value.answer).toBe(7)
  })
})

describe('scrubEmDashes', () => {
  it('replaces em dashes in strings with commas, preserving en dashes', () => {
    expect(scrubEmDashes('the road — such as it was — held')).toBe('the road, such as it was, held')
    expect(scrubEmDashes('word—word')).toBe('word, word')
    expect(scrubEmDashes('1453–1455 stands')).toBe('1453–1455 stands')
    expect(scrubEmDashes('— leading aside')).toBe('leading aside')
  })

  it('walks arrays and objects deeply without touching non-strings', () => {
    const scrubbed = scrubEmDashes({
      title: 'The ledger — kept',
      n: 3,
      ok: true,
      list: ['a — b', { note: 'c — d' }],
    })
    expect(scrubbed).toEqual({
      title: 'The ledger, kept',
      n: 3,
      ok: true,
      list: ['a, b', { note: 'c, d' }],
    })
  })

  it('applies at the generateStructured boundary', async () => {
    const scrubTemplate: PromptTemplate<{ q: string }, { answer: string }> = {
      id: 'test-scrub',
      version: '1.0.0',
      changelog: [],
      role: 'generation',
      schemaName: 'Out',
      schema: z.object({ answer: z.string() }),
      maxTokens: 100,
      system: () => 'sys',
      prompt: ({ q }) => q,
    }
    const provider: LLMProvider = {
      mode: 'mock',
      complete: async () => ({
        value: { answer: 'history bent — but held' },
        raw: '',
        model: 'm',
        mode: 'mock',
      }),
    }
    const out = await generateStructured(provider, scrubTemplate, { q: 'x' })
    expect(out.value.answer).toBe('history bent, but held')
  })
})
