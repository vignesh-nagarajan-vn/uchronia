import type Anthropic from '@anthropic-ai/sdk'
import { APIUserAbortError } from '@anthropic-ai/sdk'
import {
  GenerationAbortedError,
  ProviderResponseError,
  type StructuredRequest,
} from '@uchronia/core'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { AnthropicProvider } from './anthropic.js'

const CONFIG = {
  apiKey: 'test-key-never-used',
  models: { generation: 'gen-model', critic: 'critic-model' },
}

function request(overrides: Partial<StructuredRequest> = {}): StructuredRequest {
  return {
    templateId: 'era-generate',
    templateVersion: '1.0.0',
    role: 'generation',
    system: 'system',
    prompt: 'prompt',
    schemaName: 'Out',
    schema: z.object({ ok: z.boolean() }),
    maxTokens: 1000,
    args: {},
    seedKey: 'seed',
    ...overrides,
  }
}

interface FakeMessage {
  stop_reason: string
  model: string
  content: Array<{ type: string; text?: string }>
  usage: { input_tokens: number; output_tokens: number }
}

/** A stub of the SDK client: each call shifts the next scripted outcome. */
function fakeClient(script: Array<FakeMessage | Error>): {
  client: Anthropic
  calls: Array<{ max_tokens: number; model: string; signal: AbortSignal | undefined }>
} {
  const calls: Array<{ max_tokens: number; model: string; signal: AbortSignal | undefined }> = []
  const client = {
    messages: {
      stream: (params: { max_tokens: number; model: string }, opts?: { signal?: AbortSignal }) => {
        calls.push({ max_tokens: params.max_tokens, model: params.model, signal: opts?.signal })
        const next = script.shift()
        return {
          finalMessage: async () => {
            if (next instanceof Error) throw next
            if (!next) throw new Error('script exhausted')
            return next
          },
        }
      },
    },
  } as unknown as Anthropic
  return { client, calls }
}

const okMessage = (text: string): FakeMessage => ({
  stop_reason: 'end_turn',
  model: 'gen-model-actual',
  content: [{ type: 'text', text }],
  usage: { input_tokens: 120, output_tokens: 45 },
})

describe('AnthropicProvider', () => {
  it('returns parsed value, raw text, and token usage', async () => {
    const { client } = fakeClient([okMessage('{"ok":true}')])
    const provider = new AnthropicProvider(CONFIG, client)
    const result = await provider.complete(request())
    expect(result.value).toEqual({ ok: true })
    expect(result.raw).toBe('{"ok":true}')
    expect(result.model).toBe('gen-model-actual')
    expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 45 })
  })

  it('retries a max_tokens truncation once with a doubled budget', async () => {
    const truncated: FakeMessage = { ...okMessage('{"ok'), stop_reason: 'max_tokens' }
    const { client, calls } = fakeClient([truncated, okMessage('{"ok":true}')])
    const provider = new AnthropicProvider(CONFIG, client)
    const result = await provider.complete(request({ maxTokens: 1000 }))
    expect(result.value).toEqual({ ok: true })
    expect(calls.map((c) => c.max_tokens)).toEqual([1000, 2000])
  })

  it('fails as a non-retryable response error when truncation survives the ceiling', async () => {
    const truncated: FakeMessage = { ...okMessage('x'), stop_reason: 'max_tokens' }
    const { client } = fakeClient([truncated])
    const provider = new AnthropicProvider(CONFIG, client)
    await expect(provider.complete(request({ maxTokens: 16000 }))).rejects.toThrow(
      ProviderResponseError,
    )
  })

  it('maps a refusal to a response error', async () => {
    const refusal: FakeMessage = { ...okMessage(''), stop_reason: 'refusal' }
    const { client } = fakeClient([refusal])
    const provider = new AnthropicProvider(CONFIG, client)
    await expect(provider.complete(request())).rejects.toThrow(ProviderResponseError)
  })

  it('passes the abort signal to the SDK and maps user aborts', async () => {
    const { client, calls } = fakeClient([new APIUserAbortError()])
    const provider = new AnthropicProvider(CONFIG, client)
    const controller = new AbortController()
    await expect(provider.complete(request({ signal: controller.signal }))).rejects.toThrow(
      GenerationAbortedError,
    )
    expect(calls[0]?.signal).toBe(controller.signal)
  })

  it('routes requests to the model matching their role', async () => {
    const { client, calls } = fakeClient([okMessage('{"ok":true}'), okMessage('{"ok":true}')])
    const provider = new AnthropicProvider(CONFIG, client)
    await provider.complete(request({ role: 'critic' }))
    await provider.complete(request({ role: 'generation' }))
    expect(calls.map((c) => c.model)).toEqual(['critic-model', 'gen-model'])
  })

  it('surfaces non-JSON output as undefined value with raw preserved', async () => {
    const { client } = fakeClient([okMessage('not json at all')])
    const provider = new AnthropicProvider(CONFIG, client)
    const result = await provider.complete(request())
    expect(result.value).toBeUndefined()
    expect(result.raw).toBe('not json at all')
  })
})
