import { GenerationAbortedError, GenerationValidationError } from '../errors.js'
import type { LLMProvider, ProviderMode, StructuredRequest, TokenUsage } from '../llm.js'
import type { PromptTemplate } from '../prompts/types.js'
import { buildRequest } from '../prompts/types.js'

export interface GeneratedValue<T> {
  value: T
  model: string
  mode: ProviderMode
}

/** Per-call options threaded from the pipeline ctx (see callOpts). */
export interface CallOpts {
  signal?: AbortSignal
  /** Invoked once per completed provider call that reported usage. */
  onUsage?: (usage: TokenUsage, templateId: string, model: string) => void
}

const MAX_REPAIRS = 2

/**
 * The structured-output boundary (§4.2): every LLM call in the pipeline goes
 * through here. Output is Zod-validated; on failure the model is re-asked with
 * the validation errors attached, at most {@link MAX_REPAIRS} times, then the
 * batch fails loudly with a GenerationValidationError. Aborts are checked
 * before every attempt and the signal rides the request into the provider.
 */
export async function generateStructured<A, T>(
  provider: LLMProvider,
  template: PromptTemplate<A, T>,
  args: A,
  opts?: CallOpts,
): Promise<GeneratedValue<T>> {
  const base: StructuredRequest = {
    ...buildRequest(template, args),
    ...(opts?.signal ? { signal: opts.signal } : {}),
  }
  let request: StructuredRequest = base
  let issues: string[] = []

  for (let attempt = 0; attempt <= MAX_REPAIRS; attempt++) {
    if (opts?.signal?.aborted) throw new GenerationAbortedError()
    const result = await provider.complete(request)
    if (result.usage) opts?.onUsage?.(result.usage, template.id, result.model)

    let candidate: unknown = result.value
    if (candidate === undefined || candidate === null) {
      try {
        candidate = JSON.parse(result.raw)
      } catch {
        issues = ['response was not valid JSON']
        request = withRepair(base, result.raw, issues)
        continue
      }
    }

    const parsed = template.schema.safeParse(candidate)
    if (parsed.success) {
      return { value: parsed.data, model: result.model, mode: result.mode }
    }
    issues = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    request = withRepair(base, result.raw, issues)
  }

  throw new GenerationValidationError(template.id, issues)
}

function withRepair(
  base: StructuredRequest,
  previousRaw: string,
  issues: string[],
): StructuredRequest {
  const preview = previousRaw.length > 4000 ? `${previousRaw.slice(0, 4000)}…` : previousRaw
  return {
    ...base,
    // Vary the mock seed too, so a deterministic provider can actually retry.
    seedKey: `${base.seedKey}::repair:${issues.length}:${issues[0] ?? ''}`,
    prompt: `${base.prompt}

Your previous answer failed validation. Do not apologize; return corrected JSON only.

<previous-answer>
${preview}
</previous-answer>

<validation-errors>
${issues.map((i) => `- ${i}`).join('\n')}
</validation-errors>`,
  }
}
