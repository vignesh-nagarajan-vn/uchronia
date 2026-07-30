import type { GeneratedProvenance } from '@uchronia/schemas'
import type { LLMProvider, TokenUsage } from '../llm.js'
import type { Clock, IdGen } from '../ports.js'
import type { PromptTemplate } from '../prompts/types.js'
import type { CallOpts, ProviderCallTrace } from './structured.js'

/** Everything a pipeline stage needs, injected (§6). */
export interface PipelineCtx {
  provider: LLMProvider
  idgen: IdGen
  clock: Clock
  /** Cooperative cancellation for the whole run (client disconnect, budget cap). */
  signal?: AbortSignal
  /** Usage sink - the server sums this into cost accounting and ceilings. */
  onUsage?: (usage: TokenUsage, templateId: string, model: string) => void
  /** Engine Room sink (v2/M15) - the server persists one row per call. */
  onTrace?: (trace: ProviderCallTrace) => void
}

/** The per-call slice of the ctx that generateStructured cares about. */
export function callOpts(ctx: PipelineCtx): CallOpts {
  return {
    signal: ctx.signal,
    onUsage: ctx.onUsage,
    onTrace: ctx.onTrace,
    now: () => ctx.clock.now().getTime(),
  }
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
