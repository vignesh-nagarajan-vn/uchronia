import type { HistoriographicSchool, Interpretation } from '@uchronia/schemas'
import { NotFoundError } from '../errors.js'
import { eventInterpretation, historiographySchools } from '../prompts/historiography.js'
import type { World } from '../world.js'
import { summarizeState } from './context.js'
import { callOpts, makeProvenance, type PipelineCtx } from './ctx.js'
import { generateStructured } from './structured.js'

/**
 * In-world historiography (v2/M20). The schools are derived once per branch
 * and then reused; an event's glosses come in one call across all of them,
 * because their disagreement is the point and writing them together is what
 * makes them disagree about the same thing.
 */

/** The events a school would actually have formed around: the load-bearing ones. */
function majorEvents(world: World, branchId: string) {
  return world
    .resolveEvents(branchId)
    .filter((e) => e.flags.disputed || e.flags.convergence || e.plausibility.score >= 0.75)
    .slice(0, 8)
    .map((e) => ({ dateLabel: e.date.label, title: e.title, summary: e.summary }))
}

export async function deriveSchools(
  ctx: PipelineCtx,
  world: World,
  branchId: string,
): Promise<HistoriographicSchool[]> {
  world.getBranch(branchId)
  const generated = await generateStructured(
    ctx.provider,
    historiographySchools,
    {
      podStatement: world.pod.statement,
      stateSummary: summarizeState(world, branchId),
      majorEvents: majorEvents(world, branchId),
      region: world.pod.region,
    },
    callOpts(ctx),
  )
  const provenance = makeProvenance(ctx, historiographySchools, generated.model)
  return generated.value.schools.map((school) => ({
    id: ctx.idgen.next(),
    branchId,
    name: school.name,
    stance: school.stance,
    seat: school.seat,
    blindSpot: school.blindSpot,
    provenance,
  }))
}

export async function interpretEvent(
  ctx: PipelineCtx,
  world: World,
  branchId: string,
  eventId: string,
  schools: HistoriographicSchool[],
): Promise<Interpretation[]> {
  const event = world.resolveEvents(branchId).find((e) => e.id === eventId)
  if (!event) throw new NotFoundError('event', eventId)
  if (schools.length === 0) return []

  const generated = await generateStructured(
    ctx.provider,
    eventInterpretation,
    {
      podStatement: world.pod.statement,
      event: {
        dateLabel: event.date.label,
        title: event.title,
        summary: event.summary,
        detail: event.detail,
      },
      stateSummary: summarizeState(world, branchId),
      schools: schools.map((s) => ({ name: s.name, stance: s.stance, blindSpot: s.blindSpot })),
    },
    callOpts(ctx),
  )
  const provenance = makeProvenance(ctx, eventInterpretation, generated.model)
  // Match glosses back to schools by name, falling back to position: a model
  // that renamed a school still produced a gloss in its slot.
  const byName = new Map(schools.map((s) => [s.name.toLowerCase(), s]))
  const interpretations: Interpretation[] = []
  generated.value.glosses.forEach((gloss, i) => {
    const school = byName.get(gloss.school.toLowerCase()) ?? schools[i]
    if (!school) return
    interpretations.push({
      id: ctx.idgen.next(),
      branchId,
      eventId,
      schoolId: school.id,
      gloss: gloss.gloss,
      provenance,
    })
  })
  return interpretations
}
