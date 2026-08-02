import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import {
  GenerationAbortedError,
  type LLMProvider,
  ProviderAuthError,
  ProviderError,
  ProviderNetworkError,
  ProviderOverloadedError,
  ProviderRateLimitError,
  ProviderResponseError,
  ProviderUnknownError,
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

/** One truncation retry doubles the budget up to this ceiling. */
const MAX_TOKEN_CEILING = 16000

/**
 * The live provider. Uses the SDK's current structured-output mechanism -
 * `output_config.format` via the zodOutputFormat helper (unsupported schema
 * constraints are stripped by the helper; core re-validates everything and
 * runs the repair loop, so validation stays owned by the pipeline).
 *
 * Streaming keeps long era batches under HTTP timeouts; the SDK retries
 * 429/5xx with backoff (maxRetries). A max_tokens truncation is retried once
 * with double the budget before failing - a long era must not abort a whole
 * run. The request's AbortSignal rides into the HTTP layer so a cancelled run
 * stops billing mid-call. Token usage is reported for the server's per-run
 * accounting. Errors map onto the typed provider taxonomy - never surfaced
 * raw, never leaking the key.
 */
export class AnthropicProvider implements LLMProvider {
  readonly mode = 'live' as const
  private readonly client: Anthropic
  private readonly models: AnthropicProviderConfig['models']

  constructor(config: AnthropicProviderConfig, client?: Anthropic) {
    this.client = client ?? new Anthropic({ apiKey: config.apiKey, maxRetries: 3 })
    this.models = config.models
  }

  async complete(request: StructuredRequest): Promise<StructuredResult> {
    const model = request.role === 'generation' ? this.models.generation : this.models.critic
    let maxTokens = request.maxTokens
    try {
      for (;;) {
        const stream = this.client.messages.stream(
          {
            model,
            max_tokens: maxTokens,
            // Prompt caching (v2/M24). The system block is the stable prefix
            // of every call for a given template and dial: fragments, the
            // register, the anti-cliche mandates. Marking it cached turns the
            // repeat cost of an era loop's forty-odd calls into cache reads,
            // which the usage accounting below already knows how to report.
            // The user turn is per-call by construction and is never marked.
            system: [
              {
                type: 'text' as const,
                text: request.system,
                cache_control: { type: 'ephemeral' as const },
              },
            ],
            messages: [{ role: 'user', content: request.prompt }],
            output_config: {
              format: zodOutputFormat(request.schema),
            },
          },
          request.signal ? { signal: request.signal } : undefined,
        )
        const message = await stream.finalMessage()

        if (message.stop_reason === 'refusal') {
          throw new ProviderResponseError(
            `model declined the request (template ${request.templateId})`,
          )
        }
        if (message.stop_reason === 'max_tokens') {
          if (maxTokens < MAX_TOKEN_CEILING) {
            maxTokens = Math.min(maxTokens * 2, MAX_TOKEN_CEILING)
            continue
          }
          throw new ProviderResponseError(
            `output truncated at ${maxTokens} tokens even after retry (template ${request.templateId})`,
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

        return {
          value,
          raw,
          model: message.model,
          mode: 'live',
          usage: {
            inputTokens: message.usage.input_tokens,
            outputTokens: message.usage.output_tokens,
            cacheReadTokens: message.usage.cache_read_input_tokens ?? undefined,
            cacheWriteTokens: message.usage.cache_creation_input_tokens ?? undefined,
          },
        }
      }
    } catch (error) {
      throw mapAnthropicError(error)
    }
  }
}

/**
 * The cheapest possible proof that the configured key works: one message,
 * one output token, on the critic-tier model. Returns the resolved model id;
 * failures surface through the typed provider taxonomy (never the key).
 */
export async function livePing(
  config: AnthropicProviderConfig,
  client?: Anthropic,
): Promise<{ model: string }> {
  const anthropic = client ?? new Anthropic({ apiKey: config.apiKey, maxRetries: 1 })
  try {
    const message = await anthropic.messages.create({
      model: config.models.critic,
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    })
    return { model: message.model }
  } catch (error) {
    throw mapAnthropicError(error)
  }
}

export function mapAnthropicError(error: unknown): Error {
  if (error instanceof ProviderError || error instanceof GenerationAbortedError) return error
  if (error instanceof Anthropic.APIUserAbortError) {
    return new GenerationAbortedError('provider call aborted')
  }
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
  // Anything else is still a provider failure, and returning it unchanged put
  // it past every mapped status into the catch-all 500, where it arrived with
  // no code and no description. Name it instead.
  return new ProviderUnknownError(describeUnknown(error))
}

/** Longer than this is a stack that escaped into a message; nobody needs it. */
const MAX_UNKNOWN_CHARS = 300

/**
 * `name: message` for an arbitrary throw, with anything key-shaped removed.
 * The SDK does not echo credentials in its errors, but this string is bound
 * for an HTTP response and the rule is that key material never leaves the
 * server, not that it usually does not.
 */
function describeUnknown(error: unknown): string {
  const described =
    error instanceof Error ? `${error.name}: ${error.message}` : `non-error throw: ${String(error)}`
  const redacted = described.replace(/sk-[A-Za-z0-9_-]{8,}/g, '[redacted]')
  const clipped =
    redacted.length > MAX_UNKNOWN_CHARS ? `${redacted.slice(0, MAX_UNKNOWN_CHARS)}…` : redacted
  return `unmapped provider failure (${clipped})`
}
