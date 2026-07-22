import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import {
  type LLMProvider,
  ProviderAuthError,
  ProviderError,
  ProviderNetworkError,
  ProviderOverloadedError,
  ProviderRateLimitError,
  ProviderResponseError,
  type StructuredRequest,
  type StructuredResult,
} from '@uchronia/core'

export interface AnthropicProviderConfig {
  apiKey: string
  models: {
    generation: string
    critic: string
  }
}

/**
 * The live provider. Uses the SDK's current structured-output mechanism —
 * `output_config.format` via the zodOutputFormat helper (unsupported schema
 * constraints are stripped by the helper; core re-validates everything and
 * runs the repair loop, so validation stays owned by the pipeline).
 *
 * Streaming keeps long era batches under HTTP timeouts; the SDK retries
 * 429/5xx with backoff (maxRetries). Errors map onto the typed provider
 * taxonomy — never surfaced raw, never leaking the key.
 */
export class AnthropicProvider implements LLMProvider {
  readonly mode = 'live' as const
  private readonly client: Anthropic
  private readonly models: AnthropicProviderConfig['models']

  constructor(config: AnthropicProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey, maxRetries: 3 })
    this.models = config.models
  }

  async complete(request: StructuredRequest): Promise<StructuredResult> {
    const model = request.role === 'generation' ? this.models.generation : this.models.critic
    try {
      const stream = this.client.messages.stream({
        model,
        max_tokens: request.maxTokens,
        system: request.system,
        messages: [{ role: 'user', content: request.prompt }],
        output_config: {
          format: zodOutputFormat(request.schema),
        },
      })
      const message = await stream.finalMessage()

      if (message.stop_reason === 'refusal') {
        throw new ProviderResponseError(
          `model declined the request (template ${request.templateId})`,
        )
      }
      if (message.stop_reason === 'max_tokens') {
        throw new ProviderResponseError(
          `output truncated at ${request.maxTokens} tokens (template ${request.templateId})`,
        )
      }

      const raw = message.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')

      let value: unknown
      try {
        value = JSON.parse(raw)
      } catch {
        value = undefined // core's repair loop handles non-JSON output
      }

      return { value, raw, model: message.model, mode: 'live' }
    } catch (error) {
      throw mapAnthropicError(error)
    }
  }
}

function mapAnthropicError(error: unknown): Error {
  if (error instanceof ProviderError) return error
  if (error instanceof Anthropic.AuthenticationError) {
    return new ProviderAuthError('anthropic rejected the API key')
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return new ProviderAuthError('the API key lacks permission for this model')
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new ProviderRateLimitError('rate limited by anthropic; retry later')
  }
  if (error instanceof Anthropic.InternalServerError) {
    return new ProviderOverloadedError('anthropic service error; retry later')
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new ProviderNetworkError('could not reach anthropic')
  }
  if (error instanceof Anthropic.APIError) {
    return new ProviderResponseError(`anthropic error ${error.status ?? '?'}: ${error.message}`)
  }
  return error instanceof Error ? error : new Error(String(error))
}
