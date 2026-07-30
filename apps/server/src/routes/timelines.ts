import {
  defaultHorizonYears,
  generateStructured,
  loadBaseline,
  podInterpret,
  podNormalize,
  retrieveAnchors,
  sketchPod,
  validateWorld,
  World,
} from '@uchronia/core'
import {
  type Branch,
  CreateTimelineRequest,
  InterpretRequest,
  LENSES,
  type PointOfDivergence,
  type Timeline,
  TimelineAggregate,
  type TimelineSettings,
  UpdateTimelineRequest,
} from '@uchronia/schemas'
import { Hono } from 'hono'
import type { ServerDeps } from '../deps.js'
import { ApiError } from '../http-error.js'

export function timelineRoutes(deps: ServerDeps): Hono {
  const app = new Hono()
  const { repo, provider, idgen, clock, config } = deps

  app.get('/timelines', (c) => c.json(repo.listTimelines()))

  // Intake 2.0 (v2/M14): interpret the ask against retrieved baseline
  // anchors and offer candidate mechanisms. Creates nothing; the user
  // confirms (possibly after edits) and creation takes the confirmed reading.
  app.post('/timelines/interpret', async (c) => {
    const body = InterpretRequest.parse(await c.req.json())
    const anchors = loadBaseline().anchors
    const sketch = sketchPod(body.podText, anchors)
    const retrieved = retrieveAnchors(anchors, body.podText, {
      year: sketch.year,
      limit: 12,
    }).map((a) => ({ year: a.year, title: a.title, summary: a.summary, region: a.region }))
    const generated = await generateStructured(
      provider,
      podInterpret,
      { raw: body.podText, anchors: retrieved },
      { signal: c.req.raw.signal },
    )
    return c.json({ interpretation: generated.value, model: generated.model, mode: generated.mode })
  })

  app.post('/timelines', async (c) => {
    const body = CreateTimelineRequest.parse(await c.req.json())

    // Stage 1 of the pipeline: POD intake (§4.1). A confirmed interpretation
    // from the card is the authority when present (the user saw and accepted
    // it, possibly after edits - provenance: user); otherwise the classic
    // one-shot normalize runs.
    const now = clock.now().toISOString()
    let pod: Pick<
      PointOfDivergence,
      'statement' | 'year' | 'dateLabel' | 'region' | 'mechanism' | 'baselineContext'
    > & { suggestedTitle: string }
    let podProvenance: PointOfDivergence['provenance']
    if (body.interpretation) {
      const confirmed = body.interpretation
      pod = {
        ...confirmed,
        suggestedTitle: confirmed.suggestedTitle ?? confirmed.statement.replace(/\.$/, ''),
      }
      podProvenance = { kind: 'user' }
    } else {
      const normalized = await generateStructured(
        provider,
        podNormalize,
        { raw: body.podText },
        {
          signal: c.req.raw.signal,
        },
      )
      pod = normalized.value
      podProvenance = {
        kind: 'generated',
        model: normalized.model,
        templateId: podNormalize.id,
        templateVersion: podNormalize.version,
        generatedAt: now,
        mode: normalized.mode,
      }
    }

    const timeline: Timeline = {
      id: idgen.next(),
      title: body.title ?? pod.suggestedTitle,
      createdAt: now,
      settings: {
        dial: body.dial ?? 50,
        ...(body.axes ? { axes: body.axes } : {}),
        derivation: body.derivation ?? 'standard',
        court: body.court ?? false,
        epilogue: body.epilogue ?? false,
        // Deep time by default (v2/M18): a divergence runs to the present
        // unless the composer names a shorter road.
        horizonYears:
          body.horizonYears ?? defaultHorizonYears(pod.year, clock.now().getUTCFullYear()),
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
      provenance: podProvenance,
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

    // `axes: null` clears the overrides and hands the axes back to the master dial.
    const { axes: currentAxes, ...restSettings } = aggregate.timeline.settings
    const nextAxes = body.axes === undefined ? currentAxes : (body.axes ?? undefined)
    const settings: TimelineSettings = {
      ...restSettings,
      ...(nextAxes ? { axes: nextAxes } : {}),
      ...(body.dial !== undefined ? { dial: body.dial } : {}),
      ...(body.derivation !== undefined ? { derivation: body.derivation } : {}),
      ...(body.court !== undefined ? { court: body.court } : {}),
      ...(body.epilogue !== undefined ? { epilogue: body.epilogue } : {}),
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
