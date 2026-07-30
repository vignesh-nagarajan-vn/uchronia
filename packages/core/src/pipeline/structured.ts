import { GenerationAbortedError, GenerationValidationError } from '../errors.js'
import type {
  LLMProvider,
  ProviderMode,
  ProviderRole,
  StructuredRequest,
  TokenUsage,
} from '../llm.js'
import type { PromptTemplate } from '../prompts/types.js'
import { buildRequest } from '../prompts/types.js'

export interface GeneratedValue<T> {
  value: T
  model: string
  mode: ProviderMode
}

/**
 * One Engine Room trace (v2/M15): the full record of one structured call,
 * repair loop included. Emitted exactly once per generateStructured
 * invocation that reached the provider at least once.
 */
export interface ProviderCallTrace {
  templateId: string
  templateVersion: string
  role: ProviderRole
  /** Model of the last completed attempt; empty when no attempt returned. */
  model: string
  system: string
  /** The base rendered prompt (repair suffixes are implied by attempts > 1). */
  prompt: string
  /** Raw text of the last provider response; empty when none returned. */
  response: string
  /** Summed over every attempt of the repair loop. */
  usage: TokenUsage
  /** Provider completions performed (1 = clean first pass). */
  attempts: number
  /** The final round's validation issues; empty on success. */
  validationIssues: string[]
  ok: boolean
  error?: string
  durationMs: number
}

/** Per-call options threaded from the pipeline ctx (see callOpts). */
export interface CallOpts {
  signal?: AbortSignal
  /** Invoked once per completed provider call that reported usage. */
  onUsage?: (usage: TokenUsage, templateId: string, model: string) => void
  /** Engine Room sink: one trace per structured call. */
  onTrace?: (trace: ProviderCallTrace) => void
  /** Millisecond clock for trace timings (a port: core stays pure). */
  now?: () => number
}

const MAX_REPAIRS = 2

/**
 * House style, enforced rather than hoped for: no em dashes ever reach a
 * store. The prompts forbid them; this is the guarantee when a model slips.
 * Only U+2014/U+2015 are touched (en dashes in year ranges survive), and the
 * transform runs after schema validation — with one guard: a string the scrub
 * would empty entirely (an all-dash value) keeps its original form, because a
 * post-validation transform must never invalidate a `.min(1)` field.
 */
export function scrubEmDashes<T>(value: T): T {
  if (typeof value === 'string') {
    if (!/[—―]/.test(value)) return value
    const scrubbed = value
      .replace(/\s*[—―]+\s*/g, ', ')
      .replace(/^, /, '')
      .replace(/, $/, '')
    return (scrubbed.length > 0 ? scrubbed : value) as T
  }
  if (Array.isArray(value)) return value.map((v) => scrubEmDashes(v)) as T
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = scrubEmDashes(v)
    return out as T
  }
  return value
}

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

  const startedAt = opts?.now?.() ?? 0
  const traced: Omit<ProviderCallTrace, 'ok' | 'durationMs'> = {
    templateId: template.id,
    templateVersion: template.version,
    role: template.role,
    model: '',
    system: base.system,
    prompt: base.prompt,
    response: '',
    usage: { inputTokens: 0, outputTokens: 0 },
    attempts: 0,
    validationIssues: [],
  }
  const emitTrace = (ok: boolean, error?: string) => {
    if (!opts?.onTrace || traced.attempts === 0) return
    try {
      opts.onTrace({
        ...traced,
        validationIssues: issues,
        ok,
        ...(error !== undefined ? { error } : {}),
        durationMs: Math.max(0, (opts.now?.() ?? 0) - startedAt),
      })
    } catch {
      // The engine room must never break the engine.
    }
  }

  try {
    for (let attempt = 0; attempt <= MAX_REPAIRS; attempt++) {
      if (opts?.signal?.aborted) throw new GenerationAbortedError()
      const result = await provider.complete(request)
      traced.attempts += 1
      traced.model = result.model
      traced.response = result.raw
      if (result.usage) {
        opts?.onUsage?.(result.usage, template.id, result.model)
        traced.usage.inputTokens += result.usage.inputTokens
        traced.usage.outputTokens += result.usage.outputTokens
        if (result.usage.cacheReadTokens) {
          traced.usage.cacheReadTokens =
            (traced.usage.cacheReadTokens ?? 0) + result.usage.cacheReadTokens
        }
        if (result.usage.cacheWriteTokens) {
          traced.usage.cacheWriteTokens =
            (traced.usage.cacheWriteTokens ?? 0) + result.usage.cacheWriteTokens
        }
      }

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
        issues = []
        emitTrace(true)
        return { value: scrubEmDashes(parsed.data), model: result.model, mode: result.mode }
      }
      issues = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      request = withRepair(base, result.raw, issues)
    }

    throw new GenerationValidationError(template.id, issues)
  } catch (error) {
    emitTrace(false, error instanceof Error ? error.message : String(error))
    throw error
  }
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
