import { useQueryClient } from '@tanstack/react-query'
import type { BranchView, EntityView, EventView } from '@uchronia/schemas'
import { useCallback, useMemo, useRef, useState } from 'react'
import { streamGeneration } from './sse.js'

/** The live cost meter, fed by run.usage frames (live mode meters; demo does not). */
export interface RunMeter {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  /** Dated estimate from the server's pricing table; billing truth is Anthropic's. */
  estimatedUsd: number
  /** Models the server could not price (their tokens are outside estimatedUsd). */
  unpricedModels: string[]
}

interface UsageFrameData {
  usage?: { inputTokens?: number; outputTokens?: number }
  byModel?: Record<string, { cacheReadTokens?: number }>
  estimatedUsd?: number
  unpricedModels?: string[]
}

function meterFrom(data: UsageFrameData): RunMeter | null {
  const inputTokens = data.usage?.inputTokens ?? 0
  const outputTokens = data.usage?.outputTokens ?? 0
  if (inputTokens + outputTokens <= 0) return null
  const cacheReadTokens = Object.values(data.byModel ?? {}).reduce(
    (sum, m) => sum + (m.cacheReadTokens ?? 0),
    0,
  )
  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    estimatedUsd: data.estimatedUsd ?? 0,
    unpricedModels: data.unpricedModels ?? [],
  }
}

export interface GenerationState {
  status: 'idle' | 'running' | 'done' | 'error'
  currentEra: string | null
  error: string | null
  /** Event ids that arrived over this stream - the ink-in set. */
  freshIds: Set<string>
  /** What the run has cost so far, when the provider meters it (live mode). */
  usage: RunMeter | null
}

/**
 * Drive one generation run, applying each SSE frame to the branch-view cache
 * so events ink into the ledger as they are accepted (§4.8). On completion the
 * canonical view is refetched.
 */
export function useGeneration(branchId: string) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<GenerationState>({
    status: 'idle',
    currentEra: null,
    error: null,
    freshIds: new Set(),
    usage: null,
  })
  const abortRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const start = useCallback(async () => {
    if (abortRef.current) return
    const controller = new AbortController()
    abortRef.current = controller
    setState({ status: 'running', currentEra: null, error: null, freshIds: new Set(), usage: null })

    const key = ['branch-view', branchId]
    const update = (fn: (view: BranchView) => BranchView) => {
      queryClient.setQueryData<BranchView>(key, (old) => (old ? fn(old) : old))
    }

    // A stream that ends without run.completed/run.error was severed -
    // network drop or a serverless duration cap - and must not be presented
    // as a finished derivation.
    let sawTerminalFrame = false
    try {
      for await (const frame of streamGeneration(branchId, controller.signal)) {
        const data = frame.data as Record<string, unknown>
        switch (frame.event) {
          case 'era.started': {
            const era = data.era as BranchView['eras'][number]
            setState((s) => ({ ...s, currentEra: era.title }))
            update((view) =>
              view.eras.some((e) => e.id === era.id)
                ? view
                : { ...view, eras: [...view.eras, era] },
            )
            break
          }
          case 'era.completed': {
            const era = data.era as BranchView['eras'][number]
            update((view) => ({
              ...view,
              eras: view.eras.map((e) => (e.id === era.id ? era : e)),
            }))
            break
          }
          case 'entity.created': {
            const entity = data.entity as BranchView['entities'][number]
            const withView: EntityView = {
              ...entity,
              state: { ...entity.initialState },
              changeLog: [],
            }
            update((view) =>
              view.entities.some((e) => e.id === entity.id)
                ? view
                : { ...view, entities: [...view.entities, withView] },
            )
            break
          }
          case 'event.accepted': {
            const event = data.event as BranchView['events'][number] & { causes?: string[] }
            const edges = (data.edges ?? []) as BranchView['edges']
            // A new Set per event: the ink-in re-render is driven by state,
            // not by a lucky concurrent cache update.
            setState((s) => {
              const next = new Set(s.freshIds)
              next.add(event.id)
              return { ...s, freshIds: next }
            })
            update((view) => {
              if (view.events.some((e) => e.id === event.id)) return view
              const eventView: EventView = {
                ...event,
                causes: edges.map((e) => e.id),
                effects: [],
              }
              // Keep entity ledgers live as deltas land.
              const entities = view.entities.map((entity) => {
                const deltas = event.deltas.filter((d) => d.entityId === entity.id)
                if (deltas.length === 0) return entity
                let nextState = entity.state
                const lines = deltas.map((d) => {
                  nextState = { ...nextState, ...d.patch }
                  return {
                    eventId: event.id,
                    year: event.date.year,
                    dateLabel: event.date.label,
                    patch: d.patch,
                    note: d.note,
                  }
                })
                return { ...entity, state: nextState, changeLog: [...entity.changeLog, ...lines] }
              })
              const effectsByEvent = new Map<string, string[]>()
              for (const edge of edges) {
                effectsByEvent.set(edge.fromEventId, [
                  ...(effectsByEvent.get(edge.fromEventId) ?? []),
                  edge.id,
                ])
              }
              return {
                ...view,
                events: [
                  ...view.events.map((e) =>
                    effectsByEvent.has(e.id)
                      ? { ...e, effects: [...e.effects, ...(effectsByEvent.get(e.id) ?? [])] }
                      : e,
                  ),
                  eventView,
                ],
                edges: [...view.edges, ...edges],
                entities,
              }
            })
            break
          }
          case 'convergence.found': {
            const point = data.point as BranchView['convergences'][number]
            const eventId = data.eventId as string
            update((view) => ({
              ...view,
              convergences: [...view.convergences, point],
              events: view.events.map((e) =>
                e.id === eventId ? { ...e, flags: { ...e.flags, convergence: true } } : e,
              ),
            }))
            break
          }
          case 'run.usage': {
            const meter = meterFrom(data as UsageFrameData)
            if (meter) setState((s) => ({ ...s, usage: meter }))
            break
          }
          case 'run.completed': {
            sawTerminalFrame = true
            const meter = meterFrom(data as UsageFrameData)
            if (meter) setState((s) => ({ ...s, usage: meter }))
            break
          }
          case 'run.error': {
            sawTerminalFrame = true
            setState((s) => ({
              ...s,
              status: 'error',
              error: String((data as { message?: string }).message ?? 'generation failed'),
            }))
            break
          }
          default:
            break
        }
      }
      if (!sawTerminalFrame && !controller.signal.aborted) {
        setState((s) => ({
          ...s,
          status: 'error',
          currentEra: null,
          error:
            'the stream ended before the run finished (a network drop or a serverless time limit); everything accepted so far is saved - derive again to continue',
        }))
      } else {
        setState((s) => (s.status === 'error' ? s : { ...s, status: 'done', currentEra: null }))
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        const message = error instanceof Error ? error.message : 'generation failed'
        setState((s) => ({
          ...s,
          status: 'error',
          // A 404 at start means the branch left this serverless instance
          // (recycled or redeployed); say so instead of echoing a status code.
          error: message.includes('(404)')
            ? 'this branch is no longer on the shelf (the playground is ephemeral); return to the atlas and begin a new divergence'
            : message,
        }))
      } else {
        setState((s) => ({ ...s, status: 'done', currentEra: null }))
      }
    } finally {
      abortRef.current = null
      // Re-sync the canonical view (effects arrays, flags, reports).
      void queryClient.invalidateQueries({ queryKey: key })
    }
  }, [branchId, queryClient])

  // A stable object per (state, start, stop): consumers list the hook result
  // in effect deps without re-running every render.
  return useMemo(() => ({ state, start, stop }), [state, start, stop])
}
