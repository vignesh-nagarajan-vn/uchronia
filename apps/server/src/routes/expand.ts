import { expandEra, expandEvent, World, writeBiography } from '@uchronia/core'
import { Hono } from 'hono'
import type { ServerDeps } from '../deps.js'
import { ApiError } from '../http-error.js'

/** Lazy expansion (P5): depth on demand, persisted on first fill. */
export function expandRoutes(deps: ServerDeps): Hono {
  const app = new Hono()
  const ctx = () => ({ provider: deps.provider, idgen: deps.idgen, clock: deps.clock })

  const worldFor = (branchId: string): World => {
    const timelineId = deps.repo.branchTimelineId(branchId)
    if (!timelineId) throw new ApiError(404, 'not-found', 'branch not found')
    const aggregate = deps.repo.loadAggregate(timelineId)
    if (!aggregate) throw new ApiError(404, 'not-found', 'timeline not found')
    return World.fromAggregate(aggregate)
  }

  app.post('/branches/:branchId/events/:eventId/expand', async (c) => {
    const world = worldFor(c.req.param('branchId'))
    const event = await expandEvent(ctx(), world, c.req.param('branchId'), c.req.param('eventId'))
    if (event.detail !== null) deps.repo.updateEventDetail(event.id, event.detail)
    return c.json({ event })
  })

  app.post('/branches/:branchId/eras/:eraId/expand', async (c) => {
    const world = worldFor(c.req.param('branchId'))
    const era = await expandEra(ctx(), world, c.req.param('branchId'), c.req.param('eraId'))
    if (era.detail !== null) deps.repo.updateEraDetail(era.id, era.detail)
    return c.json({ era })
  })

  app.post('/branches/:branchId/entities/:entityId/biography', async (c) => {
    const branchId = c.req.param('branchId')
    const world = worldFor(branchId)
    const hadBiography = world.biography(branchId, c.req.param('entityId')) !== undefined
    const biography = await writeBiography(ctx(), world, branchId, c.req.param('entityId'))
    if (!hadBiography) deps.repo.insertBiography(biography)
    return c.json({ biography })
  })

  return app
}
