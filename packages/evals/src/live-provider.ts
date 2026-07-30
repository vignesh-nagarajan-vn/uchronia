import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { LLMProvider, StructuredRequest, StructuredResult, TokenUsage } from '@uchronia/core'

/**
 * A minimal live provider for eval tooling only (v2/M15). The product's real
 * provider lives in apps/server (streaming, truncation retry, typed errors);
 * this one is deliberately small - evals is a leaf tool package and must not
 * depend on an app. Usage is summed into the shared budget so eval:live can
 * refuse to overspend.
 */
export class EvalLiveProvider implements LLMProvider {
  readonly mode = 'live' as const
  private readonly client: Anthropic
  private readonly models: { generation: string; critic: string }
  readonly usage: TokenUsage = { inputTokens: 0, outputTokens: 0 }

  constructor(apiKey: string, models: { generation: string; critic: string }) {
    this.client = new Anthropic({ apiKey, maxRetries: 2 })
    this.models = models
  }

  totalTokens(): number {
    return this.usage.inputTokens + this.usage.outputTokens
  }

  async complete(request: StructuredRequest): Promise<StructuredResult> {
    const message = await this.client.messages.create(
      {
        model: request.role === 'generation' ? this.models.generation : this.models.critic,
        max_tokens: request.maxTokens,
        system: request.system,
        messages: [{ role: 'user', content: request.prompt }],
        output_config: { format: zodOutputFormat(request.schema) },
      },
      request.signal ? { signal: request.signal } : undefined,
    )
    const raw = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
    this.usage.inputTokens += message.usage.input_tokens
    this.usage.outputTokens += message.usage.output_tokens
    let value: unknown
    try {
      value = JSON.parse(raw)
    } catch {
      value = undefined
    }
    return {
      value,
      raw,
      model: message.model,
      mode: 'live',
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    }
  }
}

/**
 * Model defaults for eval tooling, mirroring the server's (apps/server owns
 * the runtime truth; evals cannot depend on an app). Overridable through the
 * same environment variables.
 */
export const EVAL_MODELS = {
  generation: process.env.UCHRONIA_MODEL_GENERATION?.trim() || 'claude-sonnet-5',
  critic: process.env.UCHRONIA_MODEL_CRITIC?.trim() || 'claude-haiku-4-5-20251001',
}

/** Refuse to run live evals anywhere but a keyed local machine (ADR-0004). */
export function requireLiveContext(): { apiKey: string } {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    console.error(
      'eval:live needs ANTHROPIC_API_KEY in the environment (local only; never CI). See docs/EVALS.md and ADR-0004.',
    )
    process.exit(2)
  }
  if (process.env.UCHRONIA_MOCK === '1' || process.env.CI) {
    console.error('eval:live refuses to run under UCHRONIA_MOCK or CI - it spends real money.')
    process.exit(2)
  }
  return { apiKey }
}
