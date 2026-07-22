import { World } from '@uchronia/core'
import { Hono } from 'hono'
import type { ServerDeps } from '../deps.js'
import { ApiError } from '../http-error.js'
import { assembleBranchView } from '../views.js'

export function branchRoutes(deps: ServerDeps): Hono {
  const app = new Hono()
  const { repo } = deps

  app.get('/branches/:id/view', (c) => {
    const branchId = c.req.param('id')
    const timelineId = repo.branchTimelineId(branchId)
    if (!timelineId) throw new ApiError(404, 'not-found', 'branch not found')
    const aggregate = repo.loadAggregate(timelineId)
    if (!aggregate) throw new ApiError(404, 'not-found', 'timeline not found')
    const world = World.fromAggregate(aggregate)
    return c.json(assembleBranchView(world, branchId))
  })

  return app
}
