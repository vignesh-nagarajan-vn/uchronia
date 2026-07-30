import { entityFates, graftEvent, pulseEvent, World } from '@uchronia/core'
import { EntityFatesResponse, GraftRequest, PulseRequest } from '@uchronia/schemas'
import { Hono } from 'hono'
import type { ServerDeps } from '../deps.js'
import { ApiError } from '../http-error.js'
import { traceSink } from '../trace-sink.js'

/**
 * Branch algebra, read-only (v2/M19). A pulse costs one generation-tier call
 * and commits nothing; the fate table is pure computation over resolved
 * state. Neither writes to the store, so neither needs a lock.
 */
export function pulseRoutes(deps: ServerDeps): Hono {
  const app = new Hono()

  const worldFor = (branchId: string): World => {
    const timelineId = deps.repo.branchTimelineId(branchId)
    if (!timelineId) throw new ApiError(404, 'not-found', 'branch not found')
    const aggregate = deps.repo.loadAggregate(timelineId)
    if (!aggregate) throw new ApiError(404, 'not-found', 'timeline not found')
    return World.fromAggregate(aggregate)
  }

  app.post('/branches/:branchId/events/:eventId/pulse', async (c) => {
    const branchId = c.req.param('branchId')
    const eventId = c.req.param('eventId')
    const world = worldFor(branchId)
    if (!world.resolveEvents(branchId).some((e) => e.id === eventId)) {
      throw new ApiError(404, 'not-found', 'event not visible from this branch')
    }
    const body = PulseRequest.parse(await c.req.json().catch(() => ({})))
    const pulse = await pulseEvent(
      {
        provider: deps.provider,
        idgen: deps.idgen,
        clock: deps.clock,
        signal: c.req.raw.signal,
        onTrace: traceSink(deps, branchId, null),
      },
      world,
      { branchId, eventId, ...(body.flip !== undefined ? { flip: body.flip } : {}) },
    )
    return c.json({ pulse })
  })

  // The graft (v2/M19). No provider call; the validator is the whole gate.
  // Soft conflicts come back unapplied so the reader can decide, then land
  // visibly disputed if they send it again with force.
  app.post('/branches/:branchId/graft', async (c) => {
    const targetBranchId = c.req.param('branchId')
    const body = GraftRequest.parse(await c.req.json())
    const world = worldFor(targetBranchId)
    if (
      deps.repo.branchTimelineId(body.sourceBranchId) !== deps.repo.branchTimelineId(targetBranchId)
    ) {
      throw new ApiError(400, 'invalid-request', 'branches belong to different timelines')
    }
    const result = graftEvent(
      { provider: deps.provider, idgen: deps.idgen, clock: deps.clock, signal: c.req.raw.signal },
      world,
      {
        sourceBranchId: body.sourceBranchId,
        targetBranchId,
        eventId: body.eventId,
        ...(body.force !== undefined ? { force: body.force } : {}),
      },
    )
    const applied = result.events.length > 0
    if (applied) {
      deps.repo.insertEra(result.era)
      for (const event of result.events) deps.repo.insertEvent(event)
      for (const edge of result.edges) deps.repo.insertEdge(edge)
    }
    return c.json({
      applied,
      disputed: result.disputed,
      eventCount: result.events.length,
      conflicts: result.conflicts,
    })
  })

  app.get('/branches/:branchId/entities/:entityId/fates', (c) => {
    const branchId = c.req.param('branchId')
    const entityId = c.req.param('entityId')
    const world = worldFor(branchId)
    const entity = world.resolveEntities(branchId).find((e) => e.id === entityId)
    if (!entity) throw new ApiError(404, 'not-found', 'entity not visible from this branch')
    return c.json(
      EntityFatesResponse.parse({
        entitySlug: entity.slug,
        name: entity.name,
        fates: entityFates(world, entityId),
      }),
    )
  })

  return app
}
