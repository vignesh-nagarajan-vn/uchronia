import type { StateValue } from '@uchronia/schemas'
import type { World } from '../world.js'

function renderValue(value: StateValue): string {
  if (Array.isArray(value)) return `[${value.join(', ')}]`
  return String(value)
}

/**
 * Compact world-state snapshot for prompts: one line per living entity,
 * ledger-style. This is what generation and critique condition on (P1) —
 * never accumulated prose.
 */
export function summarizeState(world: World, branchId: string): string {
  const state = world.stateAt(branchId)
  const lines: string[] = []
  for (const entity of world.resolveEntities(branchId)) {
    const record = state.get(entity.id) ?? entity.initialState
    const facts = Object.entries(record)
      .map(([k, v]) => `${k}=${renderValue(v)}`)
      .join('; ')
    lines.push(`- ${entity.slug} (${entity.type}, "${entity.name}"): ${facts}`)
  }
  return lines.length > 0 ? lines.join('\n') : '(no entities yet)'
}

/**
 * The recent visible past, referenceable as e<n> (1-based position in the
 * branch's visible history). `limit` keeps prompts bounded; the numbering
 * always reflects absolute positions so refs stay stable.
 */
export function summarizeRecentEvents(world: World, branchId: string, limit = 12): string {
  const events = world.resolveEvents(branchId)
  if (events.length === 0) return '(no events yet — this is the first batch)'
  const start = Math.max(0, events.length - limit)
  return events
    .slice(start)
    .map((event, i) => {
      const position = start + i + 1
      const marks = [
        event.flags.disputed ? 'disputed' : null,
        event.wildcard ? 'wildcard' : null,
      ].filter(Boolean)
      const suffix = marks.length > 0 ? ` [${marks.join(', ')}]` : ''
      return `e${position} (${event.date.label}): ${event.title} — ${event.summary}${suffix}`
    })
    .join('\n')
}
