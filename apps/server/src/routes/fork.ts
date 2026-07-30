import { forkBranch, loadBaseline, World } from '@uchronia/core'
import { type CompareView, type EventView, ForkRequest } from '@uchronia/schemas'
import { Hono } from 'hono'
import type { ServerDeps } from '../deps.js'
import { ApiError } from '../http-error.js'

export function forkRoutes(deps: ServerDeps): Hono {
  const app = new Hono()

  const worldFor = (branchId: string): World => {
    const timelineId = deps.repo.branchTimelineId(branchId)
    if (!timelineId) throw new ApiError(404, 'not-found', 'branch not found')
    const aggregate = deps.repo.loadAggregate(timelineId)
    if (!aggregate) throw new ApiError(404, 'not-found', 'timeline not found')
    return World.fromAggregate(aggregate)
  }

  app.post('/branches/:id/fork', async (c) => {
    const viewedBranchId = c.req.param('id')
    const body = ForkRequest.parse(await c.req.json())
    const world = worldFor(viewedBranchId)
    const branch = await forkBranch(
      { provider: deps.provider, idgen: deps.idgen, clock: deps.clock, signal: c.req.raw.signal },
      world,
      {
        viewedBranchId,
        forkEventId: body.eventId,
        name: body.name,
        subPodRaw: body.subPodText,
      },
    )
    deps.repo.insertBranch(branch)
    return c.json({ branch }, 201)
  })

  app.get('/compare', (c) => {
    const aId = c.req.query('a')
    const bId = c.req.query('b')
    if (!aId || !bId) throw new ApiError(400, 'invalid-request', 'query params a and b required')

    const world = worldFor(aId)
    const side = (branchId: string) => {
      const branch = world.getBranch(branchId)
      const events = world.resolveEvents(branchId)
      const edges = world.resolveEdges(branchId)
      const causes = new Map<string, string[]>()
      const effects = new Map<string, string[]>()
      for (const edge of edges) {
        causes.set(edge.toEventId, [...(causes.get(edge.toEventId) ?? []), edge.id])
        effects.set(edge.fromEventId, [...(effects.get(edge.fromEventId) ?? []), edge.id])
      }
      const views: EventView[] = events.map((e) => ({
        ...e,
        causes: causes.get(e.id) ?? [],
        effects: effects.get(e.id) ?? [],
      }))
      return { branch, eras: world.resolveEras(branchId), events: views }
    }

    const a = side(aId)

    if (bId === 'baseline') {
      const horizonEnd = world.pod.year + world.timeline.settings.horizonYears
      const anchors = loadBaseline().anchors.filter(
        (anchor) => anchor.year >= world.pod.year - 50 && anchor.year <= horizonEnd,
      )
      const view: CompareView = {
        timeline: world.timeline,
        pod: world.pod,
        a,
        b: { baseline: true, anchors },
        sharedEventIds: [],
        divergesAfterEventId: null,
      }
      return c.json(view)
    }

    const bTimelineId = deps.repo.branchTimelineId(bId)
    if (bTimelineId === null) throw new ApiError(404, 'not-found', 'branch not found')
    if (bTimelineId !== deps.repo.branchTimelineId(aId)) {
      throw new ApiError(400, 'invalid-request', 'branches belong to different timelines')
    }
    const b = side(bId)
    const bIds = new Set(b.events.map((e) => e.id))
    const sharedEventIds = a.events.filter((e) => bIds.has(e.id)).map((e) => e.id)

    // The splice (v2/M19): an optional third line, read against the same POD.
    const cId = c.req.query('c')
    let third: ReturnType<typeof side> | undefined
    if (cId && cId !== 'baseline') {
      if (deps.repo.branchTimelineId(cId) !== deps.repo.branchTimelineId(aId)) {
        throw new ApiError(400, 'invalid-request', 'branches belong to different timelines')
      }
      third = side(cId)
    }

    const view: CompareView = {
      timeline: world.timeline,
      pod: world.pod,
      a,
      b,
      ...(third ? { c: third } : {}),
      sharedEventIds,
      divergesAfterEventId: sharedEventIds.at(-1) ?? null,
    }
    return c.json(view)
  })

  return app
}
