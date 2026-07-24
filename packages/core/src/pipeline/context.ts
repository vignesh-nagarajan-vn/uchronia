import type { StateValue } from '@uchronia/schemas'
import type { World } from '../world.js'

export function renderValue(value: StateValue): string {
  if (Array.isArray(value)) return `[${value.join(', ')}]`
  return String(value)
}

/**
 * Compact world-state snapshot for prompts: one line per living entity,
 * ledger-style. This is what generation and critique condition on (P1) —
 * never accumulated prose. The snapshot is budgeted: entities rank by how
 * recently the history touched them, cold ones are withheld with a count,
 * and each line keeps only its most recently written facts — an old world
 * must not drown the "what matters now" signal (or the token budget).
 * Ended entities collapse into a terse terminal line.
 */
export function summarizeState(
  world: World,
  branchId: string,
  opts: { maxEntities?: number; maxFactsPerEntity?: number } = {},
): string {
  const maxEntities = opts.maxEntities ?? 40
  const maxFacts = opts.maxFactsPerEntity ?? 14
  const state = world.stateAt(branchId)
  const ended = world.endedEntities(branchId)

  // One pass over visible history: when was each entity (and each of its
  // state keys) last written? Initial facts count as written at introduction.
  const lastTouch = new Map<string, number>()
  const keyTouch = new Map<string, Map<string, number>>()
  world.resolveEvents(branchId).forEach((event, i) => {
    for (const delta of event.deltas) {
      lastTouch.set(delta.entityId, i)
      let keys = keyTouch.get(delta.entityId)
      if (!keys) {
        keys = new Map()
        keyTouch.set(delta.entityId, keys)
      }
      for (const key of Object.keys(delta.patch)) keys.set(key, i)
    }
  })

  const resolved = world.resolveEntities(branchId)
  const orderIndex = new Map(resolved.map((e, i) => [e.id, i]))
  const living = resolved.filter((e) => !ended.has(e.id))
  const ranked = [...living].sort((a, b) => {
    const touch = (lastTouch.get(b.id) ?? -1) - (lastTouch.get(a.id) ?? -1)
    if (touch !== 0) return touch
    return (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0)
  })
  const shown = ranked.slice(0, maxEntities)
  const withheld = ranked.length - shown.length

  const lines: string[] = []
  for (const entity of shown) {
    const record = state.get(entity.id) ?? entity.initialState
    const keys = keyTouch.get(entity.id)
    const entries = Object.entries(record).sort(
      ([a], [b]) => (keys?.get(b) ?? -1) - (keys?.get(a) ?? -1),
    )
    const kept = entries.slice(0, maxFacts)
    const dropped = entries.length - kept.length
    const facts = kept.map(([k, v]) => `${k}=${renderValue(v)}`).join('; ')
    const tail = dropped > 0 ? ` (+${dropped} older facts)` : ''
    lines.push(`- ${entity.slug} (${entity.type}, "${entity.name}"): ${facts}${tail}`)
  }
  if (withheld > 0) {
    lines.push(`- (${withheld} quieter entities withheld from this snapshot)`)
  }
  const gone = resolved
    .filter((e) => ended.has(e.id))
    .map((e) => `${e.slug} (${e.type}, ended ${ended.get(e.id)?.year})`)
  if (gone.length > 0) {
    lines.push(`- no longer extant (never mutate these): ${gone.join('; ')}`)
  }
  return lines.length > 0 ? lines.join('\n') : '(no entities yet)'
}

/**
 * The recent visible past, referenceable as e<n> (1-based position in the
 * branch's visible history). Each line carries its causal parents as
 * `[from e<n>, …]` so generation can extend existing chains instead of
 * inventing disconnected ones — the graph feeds the loop, not just the UI.
 * `limit` keeps prompts bounded; the numbering always reflects absolute
 * positions so refs stay stable.
 */
export function summarizeRecentEvents(world: World, branchId: string, limit = 12): string {
  const events = world.resolveEvents(branchId)
  if (events.length === 0) return '(no events yet — this is the first batch)'

  const positionById = new Map(events.map((e, i) => [e.id, i + 1]))
  const causesByEvent = new Map<string, number[]>()
  for (const edge of world.resolveEdges(branchId)) {
    const from = positionById.get(edge.fromEventId)
    if (from === undefined) continue
    const list = causesByEvent.get(edge.toEventId) ?? []
    list.push(from)
    causesByEvent.set(edge.toEventId, list)
  }

  const start = Math.max(0, events.length - limit)
  return events
    .slice(start)
    .map((event, i) => {
      const position = start + i + 1
      const causes = (causesByEvent.get(event.id) ?? []).sort((a, b) => a - b)
      const marks = [
        causes.length > 0 ? `from ${causes.map((n) => `e${n}`).join(', ')}` : null,
        event.flags.disputed ? 'disputed' : null,
        event.wildcard ? 'wildcard' : null,
      ].filter(Boolean)
      const suffix = marks.length > 0 ? ` [${marks.join('; ')}]` : ''
      return `e${position} (${event.date.label}): ${event.title} — ${event.summary}${suffix}`
    })
    .join('\n')
}
