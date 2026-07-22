import type { Branch, SubPod } from '@uchronia/schemas'
import { podNormalize } from '../prompts/pod-normalize.js'
import type { World } from '../world.js'
import type { PipelineCtx } from './ctx.js'
import { generateStructured } from './structured.js'

export interface ForkArgs {
  viewedBranchId: string
  forkEventId: string
  name?: string | undefined
  subPodRaw?: string | undefined
}

/**
 * Stage 6 (§4.1): fork at a visible event, with an optional sub-POD ("what if
 * she had died here?"). The sub-POD text is normalized to a clean statement;
 * the child's era loop then generates forward from the fork year with the
 * sub-divergence in context. Structural sharing means nothing is copied.
 */
export async function forkBranch(ctx: PipelineCtx, world: World, args: ForkArgs): Promise<Branch> {
  let subPod: SubPod | null = null
  if (args.subPodRaw && args.subPodRaw.trim().length > 0) {
    const normalized = await generateStructured(ctx.provider, podNormalize, {
      raw: args.subPodRaw,
    })
    subPod = { raw: args.subPodRaw, statement: normalized.value.statement }
  }

  const forkEvent = world.getEvent(args.forkEventId)
  const name =
    args.name?.trim() ||
    (subPod
      ? subPod.statement.replace(/\.$/, '').slice(0, 60)
      : `after “${forkEvent.title.slice(0, 48)}”`)

  return world.fork({
    id: ctx.idgen.next(),
    viewedBranchId: args.viewedBranchId,
    forkEventId: args.forkEventId,
    name,
    subPod,
    createdAt: ctx.clock.now().toISOString(),
  })
}
