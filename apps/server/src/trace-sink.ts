import type { ProviderCallTrace } from '@uchronia/core'
import type { ServerDeps } from './deps.js'

/**
 * The Engine Room recorder (v2/M15): persist one row per structured provider
 * call, then prune the branch to the configured run retention. Returns
 * undefined when tracing is off, so pipelines skip the work entirely.
 */
export function traceSink(
  deps: ServerDeps,
  branchId: string,
  runId: string | null,
): ((trace: ProviderCallTrace) => void) | undefined {
  if (deps.config.traceRuns <= 0) return undefined
  let pruned = false
  return (trace) => {
    try {
      deps.repo.insertTrace({
        id: deps.idgen.next(),
        branchId,
        runId,
        templateId: trace.templateId,
        templateVersion: trace.templateVersion,
        role: trace.role,
        model: trace.model,
        system: trace.system,
        prompt: trace.prompt,
        response: trace.response,
        inputTokens: trace.usage.inputTokens,
        outputTokens: trace.usage.outputTokens,
        cacheReadTokens: trace.usage.cacheReadTokens ?? null,
        cacheWriteTokens: trace.usage.cacheWriteTokens ?? null,
        attempts: trace.attempts,
        validationIssues: trace.validationIssues,
        ok: trace.ok,
        error: trace.error ?? null,
        durationMs: trace.durationMs,
        createdAt: deps.clock.now().toISOString(),
      })
      if (!pruned) {
        pruned = true
        deps.repo.pruneTraces(branchId, deps.config.traceRuns)
      }
    } catch (error) {
      // The engine room must never break the engine.
      console.error('trace persistence failed', error)
    }
  }
}
