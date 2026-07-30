import type { Event } from '@uchronia/schemas'
import { clsx } from 'clsx'

/** Archival marks: `plausibility 0.82`, `disputed - see critic notes`, `◉` convergence. */
export function PlausibilityStamp({ score }: { score: number }) {
  return (
    <span className="stamp text-ink-faded" data-testid="plausibility-stamp">
      plausibility {score.toFixed(2)}
    </span>
  )
}

export function DisputedMark({ withNotes = true }: { withNotes?: boolean }) {
  return (
    <span className="stamp font-medium text-thread" data-testid="disputed-mark">
      disputed{withNotes ? ' - see critic notes' : ''}
    </span>
  )
}

/**
 * Symposium marginalia (v2/M17): the chairs read this event differently and
 * the synthesizer kept both readings. Deliberately quiet and colourless - it
 * is an archivist's note in the margin, not a verdict, so it borrows neither
 * record blue nor thread red.
 */
export function ContestedMark({ note }: { note?: string | undefined }) {
  return (
    <span
      className="stamp italic text-ink-faded"
      title={note ?? 'the symposium could not settle this reading'}
      data-testid="contested-mark"
    >
      [contested]
    </span>
  )
}

export function ConvergenceGlyph({ note }: { note?: string | undefined }) {
  return (
    <span
      className="stamp text-record"
      title={note ?? 'converges with the attested record'}
      data-testid="convergence-glyph"
    >
      ◉ convergence
    </span>
  )
}

export function WildcardMark() {
  return <span className="stamp text-ink-faded italic">wildcard</span>
}

export function LensTicks({ lenses, className }: { lenses: Event['lenses']; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1', className)} aria-hidden="true">
      {lenses.map((lens) => (
        <span
          key={lens}
          className="inline-block h-3 w-[3px] rounded-[1px]"
          style={{ background: `var(--color-lens-${lens})` }}
          title={lens}
        />
      ))}
    </span>
  )
}
