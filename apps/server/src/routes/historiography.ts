import { deriveSchools, interpretEvent, World } from '@uchronia/core'
import { Hono } from 'hono'
import type { ServerDeps } from '../deps.js'
import { ApiError } from '../http-error.js'
import { traceSink } from '../trace-sink.js'

/**
 * In-world historiography (v2/M20). Both routes are fill-once: a branch's
 * schools are derived on first ask and reused forever, and an event's glosses
 * are written once. Asking again returns what is already there, which keeps
 * the argument stable for a reader who navigates away and comes back.
 */
export function historiographyRoutes(deps: ServerDeps): Hono {
  const app = new Hono()

  const worldFor = (branchId: string): World => {
    const timelineId = deps.repo.branchTimelineId(branchId)
    if (!timelineId) throw new ApiError(404, 'not-found', 'branch not found')
    const aggregate = deps.repo.loadAggregate(timelineId)
    if (!aggregate) throw new ApiError(404, 'not-found', 'timeline not found')
    return World.fromAggregate(aggregate)
  }

  const ctx = (signal: AbortSignal, branchId: string) => ({
    provider: deps.provider,
    idgen: deps.idgen,
    clock: deps.clock,
    signal,
    onTrace: traceSink(deps, branchId, null),
  })

  app.post('/branches/:branchId/schools', async (c) => {
    const branchId = c.req.param('branchId')
    const world = worldFor(branchId)
    const existing = world.schoolsFor(branchId)
    if (existing.length > 0) return c.json({ schools: existing })

    const schools = await deriveSchools(ctx(c.req.raw.signal, branchId), world, branchId)
    for (const school of schools) deps.repo.insertSchool(school)
    return c.json({ schools })
  })

  app.post('/branches/:branchId/events/:eventId/interpretations', async (c) => {
    const branchId = c.req.param('branchId')
    const eventId = c.req.param('eventId')
    const world = worldFor(branchId)
    if (!world.resolveEvents(branchId).some((e) => e.id === eventId)) {
      throw new ApiError(404, 'not-found', 'event not visible from this branch')
    }

    const already = world.interpretationsFor(branchId).filter((i) => i.eventId === eventId)
    if (already.length > 0) {
      return c.json({ schools: world.schoolsFor(branchId), interpretations: already })
    }

    // The schools have to exist before anything can be read through them.
    let schools = world.schoolsFor(branchId)
    if (schools.length === 0) {
      schools = await deriveSchools(ctx(c.req.raw.signal, branchId), world, branchId)
      for (const school of schools) deps.repo.insertSchool(school)
    }

    const interpretations = await interpretEvent(
      ctx(c.req.raw.signal, branchId),
      world,
      branchId,
      eventId,
      schools,
    )
    for (const interpretation of interpretations) deps.repo.insertInterpretation(interpretation)
    return c.json({ schools, interpretations })
  })

  return app
}
