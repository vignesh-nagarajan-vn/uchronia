import {
  estimateUsd,
  GenerationAbortedError,
  type PipelineEvent,
  runGeneration,
  type TokenUsage,
  UchroniaError,
  type UsageByModel,
  World,
} from '@uchronia/core'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { ServerDeps } from '../deps.js'
import { ApiError } from '../http-error.js'
import { traceSink } from '../trace-sink.js'

/** Persist one pipeline event's mutations. Runs before the event is streamed. */
function persistPipelineEvent(deps: ServerDeps, ev: PipelineEvent): void {
  switch (ev.type) {
    case 'era.started':
      deps.repo.insertEra(ev.era)
      break
    case 'entity.created':
      deps.repo.insertEntity(ev.entity)
      break
    case 'event.accepted':
      deps.repo.insertEvent(ev.event)
      for (const edge of ev.edges) deps.repo.insertEdge(edge)
      break
    case 'critique.completed':
      deps.repo.insertCritique(ev.report)
      break
    case 'court.completed':
      deps.repo.insertCourtRecord(ev.record)
      break
    case 'claim.recorded':
      deps.repo.insertClaim(ev.claim)
      break
    case 'convergence.found':
      deps.repo.insertConvergence(ev.point)
      deps.repo.updateEventFlags(ev.eventId, { convergence: true })
      break
    case 'era.completed':
      deps.repo.updateEraAfterGeneration(ev.era)
      break
    default:
      break // run.started / run.completed / warning carry no mutations
  }
}

/**
 * A crash mid-era leaves the trailing era half-persisted: events without a
 * critique report. Resume counts it as done and would skip it forever, so it
 * is rolled back here (unless someone forked off it) and regenerated whole.
 * Healthy eras always carry a critique report (M4+), so the test is exact.
 */
function healPartialTrailingEra(deps: ServerDeps, world: World, branchId: string): string | null {
  const lastEra = world.ownEras(branchId).at(-1)
  if (!lastEra) return null
  const hasCritique = world
    .critiqueReports()
    .some((r) => r.branchId === branchId && r.eraId === lastEra.id)
  if (hasCritique) return null
  const eraEventIds = world
    .ownEvents(branchId)
    .filter((e) => e.eraId === lastEra.id)
    .map((e) => e.id)
  const forkedFrom = world
    .allBranches()
    .some((b) => b.forkEventId !== null && eraEventIds.includes(b.forkEventId))
  if (forkedFrom) return null // someone built on it; keep it, uncritiqued
  deps.repo.deleteEraCascade(lastEra.id, eraEventIds)
  return lastEra.title
}

/**
 * POST /api/branches/:id/generate - run the pipeline, streaming pipeline
 * events as SSE (§4.8). Each mutation is persisted before it is streamed, so
 * whatever the client saw is exactly what the database holds; a client abort
 * cancels in-flight provider calls via AbortSignal and keeps everything
 * accepted so far. One run per branch at a time per process - a second request
 * to the same process 409s instead of duplicating ordinals; across processes
 * (or serverless instances, each with its own database) the unique
 * (branch_id, ordinal) index is the durable backstop.
 */
export function generateRoutes(deps: ServerDeps): Hono {
  const app = new Hono()
  const activeBranches = new Set<string>()
  const pace = deps.config.mockPaceMs

  app.post('/branches/:id/generate', (c) => {
    const branchId = c.req.param('id')
    const timelineId = deps.repo.branchTimelineId(branchId)
    if (!timelineId) throw new ApiError(404, 'not-found', 'branch not found')
    if (activeBranches.has(branchId)) {
      throw new ApiError(409, 'generation-active', 'a derivation is already running on this branch')
    }

    let aggregate = deps.repo.loadAggregate(timelineId)
    if (!aggregate) throw new ApiError(404, 'not-found', 'timeline not found')

    let healedEra: string | null = null
    healedEra = healPartialTrailingEra(deps, World.fromAggregate(aggregate), branchId)
    if (healedEra !== null) {
      aggregate = deps.repo.loadAggregate(timelineId)
      if (!aggregate) throw new ApiError(404, 'not-found', 'timeline not found')
    }

    const world = World.fromAggregate(aggregate)
    const controller = new AbortController()
    const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 }
    // Per-model splits feed the cost meter: sonnet input is not haiku input.
    const byModel: UsageByModel = {}
    let usageDirty = false
    let budgetExceeded = false
    const onUsage = (u: TokenUsage, _templateId: string, model: string) => {
      usage.inputTokens += u.inputTokens
      usage.outputTokens += u.outputTokens
      byModel[model] ??= { inputTokens: 0, outputTokens: 0 }
      const m = byModel[model]
      m.inputTokens += u.inputTokens
      m.outputTokens += u.outputTokens
      if (u.cacheReadTokens) m.cacheReadTokens = (m.cacheReadTokens ?? 0) + u.cacheReadTokens
      if (u.cacheWriteTokens) m.cacheWriteTokens = (m.cacheWriteTokens ?? 0) + u.cacheWriteTokens
      usageDirty = true
      // The day's ledger is charged in the provider wrapper now (v2.1/M26),
      // as the run spends rather than at the end: a run killed halfway still
      // cost what it cost, and every other spending route is charged too.
      const cap = deps.config.maxRunTokens
      if (cap > 0 && usage.inputTokens + usage.outputTokens > cap && !budgetExceeded) {
        budgetExceeded = true
        controller.abort()
      }
    }
    const costFrame = () => {
      const { usd, unpriced } = estimateUsd(byModel)
      return { usage, byModel, estimatedUsd: usd, unpricedModels: unpriced }
    }

    const runId = deps.idgen.next()
    const run = runGeneration(
      {
        provider: deps.provider,
        idgen: deps.idgen,
        clock: deps.clock,
        signal: controller.signal,
        onUsage,
        onTrace: traceSink(deps, branchId, runId),
      },
      world,
      branchId,
    )

    activeBranches.add(branchId)
    // Proxies (including serverless edges) must not buffer the event stream.
    c.header('X-Accel-Buffering', 'no')
    return streamSSE(c, async (stream) => {
      const abort = () => controller.abort()
      c.req.raw.signal.addEventListener('abort', abort)
      let pacedEvents = 0
      try {
        if (healedEra !== null) {
          await stream.writeSSE({
            event: 'warning',
            data: JSON.stringify({
              type: 'warning',
              message: `an interrupted run left era "${healedEra}" half-written; it was rolled back and will regenerate`,
            }),
          })
        }
        for await (const ev of run) {
          persistPipelineEvent(deps, ev)
          const frame = ev.type === 'run.completed' ? { ...ev, ...costFrame() } : ev
          await stream.writeSSE({ event: ev.type, data: JSON.stringify(frame) })
          // The live cost meter: whenever provider calls landed since the last
          // frame, follow with a cumulative usage frame (live mode only; the
          // mock meters nothing, so demo streams stay exactly as before).
          if (usageDirty && ev.type !== 'run.completed') {
            usageDirty = false
            await stream.writeSSE({
              event: 'run.usage',
              data: JSON.stringify({ type: 'run.usage', ...costFrame() }),
            })
          }
          // Pace the first stretch only: the ink-in is a demo moment, and a
          // long-horizon run must not walk into serverless time limits.
          if (pace > 0 && ev.type === 'event.accepted' && pacedEvents < 60) {
            pacedEvents += 1
            await new Promise((r) => setTimeout(r, pace))
          }
        }
      } catch (error) {
        if (error instanceof GenerationAbortedError && !budgetExceeded) {
          return // client hung up; everything accepted so far is persisted
        }
        const code = budgetExceeded
          ? 'budget-exceeded'
          : error instanceof UchroniaError
            ? error.code
            : 'internal'
        const message = budgetExceeded
          ? `run stopped at the ${deps.config.maxRunTokens}-token ceiling; continue derivation to resume`
          : error instanceof Error
            ? error.message
            : 'generation failed'
        if (!budgetExceeded) console.error('generation run failed', error)
        await stream.writeSSE({ event: 'run.error', data: JSON.stringify({ code, message }) })
      } finally {
        activeBranches.delete(branchId)
        c.req.raw.signal.removeEventListener('abort', abort)
      }
    })
  })

  return app
}
