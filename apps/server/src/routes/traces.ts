import { estimateUsd } from '@uchronia/core'
import { Hono } from 'hono'
import type { RunTraceSummaryRow } from '../db/repo.js'
import type { ServerDeps } from '../deps.js'
import { ApiError } from '../http-error.js'

/**
 * The Engine Room (v2/M15): read-only inspection of persisted provider-call
 * traces. Summaries carry usage and a dated cost estimate; the detail route
 * returns the full rendered prompt and raw response for one call.
 */
export function traceRoutes(deps: ServerDeps): Hono {
  const app = new Hono()

  const withCost = (row: RunTraceSummaryRow) => ({
    ...row,
    estimatedUsd: estimateUsd({
      [row.model || 'unknown']: {
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        cacheReadTokens: row.cacheReadTokens ?? undefined,
        cacheWriteTokens: row.cacheWriteTokens ?? undefined,
      },
    }).usd,
  })

  app.get('/branches/:id/traces', (c) => {
    const branchId = c.req.param('id')
    if (!deps.repo.branchTimelineId(branchId)) {
      throw new ApiError(404, 'not-found', 'branch not found')
    }
    return c.json({
      tracing: deps.config.traceRuns > 0,
      retainedRuns: deps.config.traceRuns,
      traces: deps.repo.listTraces(branchId).map(withCost),
    })
  })

  app.get('/traces/:id', (c) => {
    const row = deps.repo.getTrace(c.req.param('id'))
    if (!row) throw new ApiError(404, 'not-found', 'trace not found')
    return c.json({ trace: withCost(row) })
  })

  return app
}
