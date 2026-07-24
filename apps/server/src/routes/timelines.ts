import { generateStructured, podNormalize, validateWorld, World } from '@uchronia/core'
import {
  type Branch,
  CreateTimelineRequest,
  LENSES,
  type PointOfDivergence,
  type Timeline,
  TimelineAggregate,
  UpdateTimelineRequest,
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
    const normalized = await generateStructured(
      provider,
      podNormalize,
      { raw: body.podText },
      {
        signal: c.req.raw.signal,
      },
    )
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

  // Rename, retune the dial, extend the horizon. The era plan is append-only,
  // so a grown horizon simply gives "continue derivation" more road; shrinking
  // would orphan committed eras and is refused.
  app.patch('/timelines/:id', async (c) => {
    const timelineId = c.req.param('id')
    const body = UpdateTimelineRequest.parse(await c.req.json())
    const aggregate = repo.loadAggregate(timelineId)
    if (!aggregate) throw new ApiError(404, 'not-found', 'timeline not found')

    if (
      body.horizonYears !== undefined &&
      body.horizonYears < aggregate.timeline.settings.horizonYears
    ) {
      throw new ApiError(
        409,
        'horizon-shrink',
        `the horizon can only extend (currently ${aggregate.timeline.settings.horizonYears} years)`,
      )
    }

    const settings = {
      ...aggregate.timeline.settings,
      ...(body.dial !== undefined ? { dial: body.dial } : {}),
      ...(body.horizonYears !== undefined ? { horizonYears: body.horizonYears } : {}),
      ...(body.defaultLenses !== undefined ? { defaultLenses: body.defaultLenses } : {}),
    }
    repo.updateTimelineSettings(timelineId, settings)
    if (body.title !== undefined) repo.updateTimelineTitle(timelineId, body.title)

    const timeline: Timeline = {
      ...aggregate.timeline,
      title: body.title ?? aggregate.timeline.title,
      settings,
    }
    return c.json({ timeline })
  })

  app.post('/import', async (c) => {
    const aggregate = TimelineAggregate.parse(await c.req.json())
    if (repo.timelineExists(aggregate.timeline.id)) {
      throw new ApiError(409, 'conflict', `timeline ${aggregate.timeline.id} already exists`)
    }
    // Shape is not enough: a schema-valid aggregate with broken references
    // would persist cleanly and then 500 on every later read, forever. Hydrate
    // and run the machine validator before anything touches the database.
    let issues: string[]
    try {
      const world = World.fromAggregate(aggregate)
      issues = validateWorld(world).map((i) => `${i.rule}: ${i.message}`)
      for (const branch of world.allBranches()) world.resolveEvents(branch.id)
    } catch (error) {
      issues = [error instanceof Error ? error.message : String(error)]
    }
    if (issues.length > 0) {
      throw new ApiError(
        422,
        'invalid-import',
        `the ledger fails integrity checks: ${issues.slice(0, 5).join('; ')}${issues.length > 5 ? ` (+${issues.length - 5} more)` : ''}`,
      )
    }
    repo.saveAggregate(aggregate)
    return c.json({ timelineId: aggregate.timeline.id }, 201)
  })

  return app
}
