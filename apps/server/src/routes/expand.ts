import {
  expandEra,
  expandEvent,
  regenerateCommittedEvent,
  World,
  writeBiography,
} from '@uchronia/core'
import { RegenerateEventRequest } from '@uchronia/schemas'
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

  // A fresh telling of a committed event, in place — the reader's remedy for
  // a flat or disputed entry. Validated on a clone before it lands.
  app.post('/branches/:branchId/events/:eventId/regenerate', async (c) => {
    const branchId = c.req.param('branchId')
    const body = RegenerateEventRequest.parse(await c.req.json().catch(() => ({})))
    const world = worldFor(branchId)
    const event = await regenerateCommittedEvent(
      ctx(),
      world,
      branchId,
      c.req.param('eventId'),
      body.guidance,
    )
    deps.repo.updateEventContent(event)
    return c.json({ event: world.eventView(branchId, event.id) })
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
