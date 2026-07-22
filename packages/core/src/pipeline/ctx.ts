import type { GeneratedProvenance } from '@uchronia/schemas'
import type { LLMProvider } from '../llm.js'
import type { Clock, IdGen } from '../ports.js'
import type { PromptTemplate } from '../prompts/types.js'

/** Everything a pipeline stage needs, injected (§6). */
export interface PipelineCtx {
  provider: LLMProvider
  idgen: IdGen
  clock: Clock
}

export function makeProvenance(
  ctx: PipelineCtx,
  template: Pick<PromptTemplate<unknown, unknown>, 'id' | 'version'>,
  model: string,
): GeneratedProvenance {
  return {
    kind: 'generated',
    model,
    templateId: template.id,
    templateVersion: template.version,
    generatedAt: ctx.clock.now().toISOString(),
    mode: ctx.provider.mode,
  }
}
