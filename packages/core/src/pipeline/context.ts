import type { StateValue } from '@uchronia/schemas'
import type { World } from '../world.js'

export function renderValue(value: StateValue): string {
  if (Array.isArray(value)) return `[${value.join(', ')}]`
  return String(value)
}

/**
 * Compact world-state snapshot for prompts: one line per living entity,
 * ledger-style. This is what generation and critique condition on (P1) —
 * never accumulated prose. Ended entities collapse into a terse terminal
 * line: the model must know they are gone without carrying their ledgers.
 */
export function summarizeState(world: World, branchId: string): string {
  const state = world.stateAt(branchId)
  const ended = world.endedEntities(branchId)
  const lines: string[] = []
  const gone: string[] = []
  for (const entity of world.resolveEntities(branchId)) {
    const end = ended.get(entity.id)
    if (end) {
      gone.push(`${entity.slug} (${entity.type}, ended ${end.year})`)
      continue
    }
    const record = state.get(entity.id) ?? entity.initialState
    const facts = Object.entries(record)
      .map(([k, v]) => `${k}=${renderValue(v)}`)
      .join('; ')
    lines.push(`- ${entity.slug} (${entity.type}, "${entity.name}"): ${facts}`)
  }
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
