import { generateStructured, podNormalize } from '@uchronia/core'
import {
  type Branch,
  CreateTimelineRequest,
  LENSES,
  type PointOfDivergence,
  type Timeline,
  TimelineAggregate,
} from '@uchronia/schemas'
import { Hono } from 'hono'
import type { ServerDeps } from '../deps.js'
import { ApiError } from '../http-error.js'

export function timelineRoutes(deps: ServerDeps): Hono {
  const app = new Hono()
  const { repo, provider, idgen, clock, config } = deps

  app.get('/timelines', (c) => c.json(repo.listTimelines()))

  app.post('/timelines', async (c) => {
    const body = CreateTimelineRequest.parse(await c.req.json())

    // Stage 1 of the pipeline: POD intake (§4.1). Validated + repair-looped.
    const normalized = await generateStructured(provider, podNormalize, { raw: body.podText })
    const pod = normalized.value

    const now = clock.now().toISOString()
    const timeline: Timeline = {
      id: idgen.next(),
      title: body.title ?? pod.suggestedTitle,
      createdAt: now,
      settings: {
        dial: body.dial ?? 50,
        horizonYears: body.horizonYears ?? 150,
        defaultLenses: body.lenses ?? [...LENSES],
        models: {
          generation: config.models.generation,
          critic: config.models.critic,
          mode: provider.mode,
        },
      },
    }
    const podRow: PointOfDivergence = {
      id: idgen.next(),
      timelineId: timeline.id,
      raw: body.podText,
      statement: pod.statement,
      year: pod.year,
      dateLabel: pod.dateLabel,
      region: pod.region,
      mechanism: pod.mechanism,
      baselineContext: pod.baselineContext,
      provenance: {
        kind: 'generated',
        model: normalized.model,
        templateId: podNormalize.id,
        templateVersion: podNormalize.version,
        generatedAt: now,
        mode: normalized.mode,
      },
    }
    const rootBranch: Branch = {
      id: idgen.next(),
      timelineId: timeline.id,
      parentBranchId: null,
      forkEventId: null,
      subPod: null,
      name: 'main line',
      createdAt: now,
    }

    repo.createTimeline(timeline, podRow, rootBranch)
    return c.json({ timeline, pod: podRow, rootBranch }, 201)
  })

  app.get('/timelines/:id', (c) => {
    const aggregate = repo.loadAggregate(c.req.param('id'))
    if (!aggregate) throw new ApiError(404, 'not-found', 'timeline not found')
    return c.json(aggregate)
  })

  app.get('/timelines/:id/export.json', (c) => {
    const aggregate = repo.loadAggregate(c.req.param('id'))
    if (!aggregate) throw new ApiError(404, 'not-found', 'timeline not found')
    c.header('Content-Disposition', `attachment; filename="uchronia-${aggregate.timeline.id}.json"`)
    return c.json(aggregate)
  })

  app.delete('/timelines/:id', (c) => {
    const deleted = repo.deleteTimeline(c.req.param('id'))
    if (!deleted) throw new ApiError(404, 'not-found', 'timeline not found')
    return c.body(null, 204)
  })

  app.post('/import', async (c) => {
    const aggregate = TimelineAggregate.parse(await c.req.json())
    if (repo.timelineExists(aggregate.timeline.id)) {
      throw new ApiError(409, 'conflict', `timeline ${aggregate.timeline.id} already exists`)
    }
    repo.saveAggregate(aggregate)
    return c.json({ timelineId: aggregate.timeline.id }, 201)
  })

  return app
}
