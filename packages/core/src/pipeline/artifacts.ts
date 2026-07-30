import type { Artifact, ArtifactKind } from '@uchronia/schemas'
import { dialParams } from '../dial.js'
import { NotFoundError } from '../errors.js'
import {
  type ArtifactArgs,
  artifactClassified,
  artifactEncyclopedia,
  artifactLetter,
  artifactNewspaper,
  artifactObituary,
  artifactPoster,
  artifactRadio,
  artifactTelegram,
} from '../prompts/artifacts.js'
import type { PromptTemplate } from '../prompts/types.js'
import type { World } from '../world.js'
import { callOpts, makeProvenance, type PipelineCtx } from './ctx.js'
import { generateStructured } from './structured.js'

// Partial because `inquiry` is stored as an artifact but is not forged from
// an event; it is saved from a Grand Inquiry, which starts from a thesis.
const TEMPLATES: Partial<
  Record<ArtifactKind, PromptTemplate<ArtifactArgs, { title: string; body: Artifact['body'] }>>
> = {
  newspaper: artifactNewspaper,
  letter: artifactLetter,
  encyclopedia: artifactEncyclopedia,
  poster: artifactPoster,
  telegram: artifactTelegram,
  radio: artifactRadio,
  obituary: artifactObituary,
  classified: artifactClassified,
}

/**
 * F8: generate a diegetic artifact for an event, conditioned on the state as
 * of that event. One artifact per (event, kind) - the mock is deterministic
 * anyway, and the reader deserves a stable document; asking again returns it.
 */
export async function generateArtifact(
  ctx: PipelineCtx,
  world: World,
  branchId: string,
  eventId: string,
  kind: ArtifactKind,
): Promise<{ artifact: Artifact; created: boolean }> {
  const event = world.getEvent(eventId)
  if (!world.resolveEvents(branchId).some((e) => e.id === eventId)) {
    throw new NotFoundError('event visible on branch', eventId)
  }
  const existing = world.artifactsForEvent(eventId).find((a) => a.kind === kind)
  if (existing) return { artifact: existing, created: false }

  const stateAtEvent = world.stateAt(branchId, eventId)
  const stateLines: string[] = []
  for (const entity of world.resolveEntities(branchId)) {
    const record = stateAtEvent.get(entity.id)
    if (!record) continue
    const facts = Object.entries(record)
      .map(([k, v]) => `${k}=${Array.isArray(v) ? `[${v.join(', ')}]` : String(v)}`)
      .join('; ')
    stateLines.push(`- ${entity.slug} (${entity.type}, "${entity.name}"): ${facts}`)
  }

  const template = TEMPLATES[kind]
  if (!template) {
    throw new NotFoundError('artifact template', kind)
  }
  const generated = await generateStructured(
    ctx.provider,
    template,
    {
      podStatement: world.pod.statement,
      event: {
        title: event.title,
        summary: event.summary,
        dateLabel: event.date.label,
        year: event.date.year,
        detail: event.detail,
      },
      stateSummary: stateLines.join('\n'),
      region: world.pod.region,
      distanceYears: event.distanceFromPod,
      voice: dialParams(world.timeline.settings.dial).voiceLanguage,
    },
    callOpts(ctx),
  )

  const artifact: Artifact = {
    id: ctx.idgen.next(),
    eventId,
    kind,
    title: generated.value.title,
    body: generated.value.body,
    stylingHints: { tone: null, period: null },
    provenance: makeProvenance(ctx, template, generated.model),
  }
  world.addArtifact(artifact)
  return { artifact, created: true }
}
