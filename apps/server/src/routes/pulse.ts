import { entityFates, pulseEvent, World } from '@uchronia/core'
import { EntityFatesResponse, PulseRequest } from '@uchronia/schemas'
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
