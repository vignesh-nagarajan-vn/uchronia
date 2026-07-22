import { GenerationValidationError } from '../errors.js'
import type { LLMProvider, ProviderMode } from '../llm.js'
import type { PromptTemplate } from '../prompts/types.js'
import { buildRequest } from '../prompts/types.js'

export interface GeneratedValue<T> {
  value: T
  model: string
  mode: ProviderMode
}

const MAX_REPAIRS = 2

/**
 * The structured-output boundary (§4.2): every LLM call in the pipeline goes
 * through here. Output is Zod-validated; on failure the model is re-asked with
 * the validation errors attached, at most {@link MAX_REPAIRS} times, then the
 * batch fails loudly with a GenerationValidationError.
 */
export async function generateStructured<A, T>(
  provider: LLMProvider,
  template: PromptTemplate<A, T>,
  args: A,
): Promise<GeneratedValue<T>> {
  const base = buildRequest(template, args)
  let request = base
  let issues: string[] = []

  for (let attempt = 0; attempt <= MAX_REPAIRS; attempt++) {
    const result = await provider.complete(request)

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
  base: ReturnType<typeof buildRequest>,
  previousRaw: string,
  issues: string[],
): ReturnType<typeof buildRequest> {
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
