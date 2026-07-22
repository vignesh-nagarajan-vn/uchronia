import type { EntityView, EventView } from '@uchronia/schemas'
import { clsx } from 'clsx'
import { Link } from 'react-router'
import {
  ConvergenceGlyph,
  DisputedMark,
  LensTicks,
  PlausibilityStamp,
  WildcardMark,
} from './Stamp.js'

export interface EventCardProps {
  event: EventView
  entities: Map<string, EntityView>
  branchPath: string
  focused?: boolean
  dimmed?: boolean
  /** Causal relations currently off-screen (virtualized): [upCount, downCount]. */
  offscreenRelations?: [number, number]
  onHoverChange?: (hovering: boolean) => void
  convergenceNote?: string | undefined
}

export function EventCard({
  event,
  entities,
  branchPath,
  focused,
  dimmed,
  offscreenRelations,
  onHoverChange,
  convergenceNote,
}: EventCardProps) {
  const related = event.causes.length + event.effects.length
  const [up, down] = offscreenRelations ?? [0, 0]

  return (
    <article
      data-event-id={event.id}
      className={clsx(
        'group relative ml-2 rounded-[2px] border border-transparent px-3 py-2 transition-colors',
        'hover:border-rule hover:bg-paper-raised focus-within:border-rule focus-within:bg-paper-raised',
        focused && 'border-rule bg-paper-raised',
        dimmed && 'thread-dim',
      )}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onFocus={() => onHoverChange?.(true)}
      onBlur={() => onHoverChange?.(false)}
      aria-description={
        related > 0
          ? `${event.causes.length} recorded causes, ${event.effects.length} effects`
          : undefined
      }
    >
      <div className="grid grid-cols-[72px_1fr] gap-3">
        <div className="pt-[3px] text-right">
          <span className="font-data text-ink-faded">{event.date.label}</span>
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug">
            <Link
              to={`${branchPath}/e/${event.id}`}
              className="rounded-[2px] outline-offset-4 hover:underline decoration-rule underline-offset-4"
            >
              {event.title}
            </Link>
          </h3>
          <p className="mt-0.5 line-clamp-2 text-[15px] text-ink/90">{event.summary}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <LensTicks lenses={event.lenses} />
            {event.entityIds.slice(0, 4).map((id) => {
              const entity = entities.get(id)
              if (!entity) return null
              return (
                <Link
                  key={id}
                  to={`${branchPath}/entity/${id}`}
                  className="font-data text-[12px] text-ink-faded hover:text-ink hover:underline underline-offset-2"
                >
                  {entity.name}
                </Link>
              )
            })}
            <PlausibilityStamp score={event.plausibility.score} />
            {event.wildcard && <WildcardMark />}
            {event.flags.convergence && <ConvergenceGlyph note={convergenceNote} />}
            {event.flags.disputed && <DisputedMark />}
            {(up > 0 || down > 0) && (
              <span
                className="stamp text-thread"
                title="causal relations beyond the visible ledger"
              >
                {up > 0 ? `${up} ↑` : ''}
                {up > 0 && down > 0 ? ' · ' : ''}
                {down > 0 ? `${down} ↓` : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
