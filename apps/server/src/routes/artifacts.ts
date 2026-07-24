import { generateArtifact, World } from '@uchronia/core'
import { ArtifactKind } from '@uchronia/schemas'
import { Hono } from 'hono'
import { z } from 'zod'
import type { ServerDeps } from '../deps.js'
import { ApiError } from '../http-error.js'

const ArtifactRequest = z.object({ kind: ArtifactKind })

export function artifactRoutes(deps: ServerDeps): Hono {
  const app = new Hono()

  app.post('/branches/:branchId/events/:eventId/artifacts', async (c) => {
    const branchId = c.req.param('branchId')
    const body = ArtifactRequest.parse(await c.req.json())

    const timelineId = deps.repo.branchTimelineId(branchId)
    if (!timelineId) throw new ApiError(404, 'not-found', 'branch not found')
    const aggregate = deps.repo.loadAggregate(timelineId)
    if (!aggregate) throw new ApiError(404, 'not-found', 'timeline not found')
    const world = World.fromAggregate(aggregate)

    const { artifact, created } = await generateArtifact(
      { provider: deps.provider, idgen: deps.idgen, clock: deps.clock, signal: c.req.raw.signal },
      world,
      branchId,
      c.req.param('eventId'),
      body.kind,
    )
    if (created) deps.repo.insertArtifact(artifact)
    return c.json({ artifact }, created ? 201 : 200)
  })

  return app
}
