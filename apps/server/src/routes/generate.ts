import { type PipelineEvent, runGeneration, UchroniaError, World } from '@uchronia/core'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { ServerDeps } from '../deps.js'
import { ApiError } from '../http-error.js'

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
    case 'event.disputed':
      deps.repo.updateEventFlags(ev.event.id, {
        disputed: true,
        criticNotes: ev.event.criticNotes,
      })
      break
    case 'critique.completed':
      deps.repo.insertCritique(ev.report)
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
 * POST /api/branches/:id/generate — run the pipeline, streaming pipeline
 * events as SSE (§4.8). Each mutation is persisted before it is streamed, so
 * whatever the client saw is exactly what the database holds; a client abort
 * stops generation at the next event boundary and keeps everything accepted
 * so far (the store is consistent after every accepted event).
 */
export function generateRoutes(deps: ServerDeps): Hono {
  const app = new Hono()

  app.post('/branches/:id/generate', (c) => {
    const branchId = c.req.param('id')
    const timelineId = deps.repo.branchTimelineId(branchId)
    if (!timelineId) throw new ApiError(404, 'not-found', 'branch not found')
    const aggregate = deps.repo.loadAggregate(timelineId)
    if (!aggregate) throw new ApiError(404, 'not-found', 'timeline not found')

    const world = World.fromAggregate(aggregate)
    const run = runGeneration(
      { provider: deps.provider, idgen: deps.idgen, clock: deps.clock },
      world,
      branchId,
    )

    return streamSSE(c, async (stream) => {
      const abort = () => {
        void run.return(undefined)
      }
      c.req.raw.signal.addEventListener('abort', abort)
      try {
        for await (const ev of run) {
          persistPipelineEvent(deps, ev)
          await stream.writeSSE({ event: ev.type, data: JSON.stringify(ev) })
        }
      } catch (error) {
        const code = error instanceof UchroniaError ? error.code : 'internal'
        const message = error instanceof Error ? error.message : 'generation failed'
        console.error('generation run failed', error)
        await stream.writeSSE({ event: 'run.error', data: JSON.stringify({ code, message }) })
      } finally {
        c.req.raw.signal.removeEventListener('abort', abort)
      }
    })
  })

  return app
}
