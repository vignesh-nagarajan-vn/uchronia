import type { Era } from '@uchronia/schemas'
import { formatYearRange } from '../lib/format.js'

const ROMAN = [
  '0',
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
  'XIV',
]

export function toRoman(n: number): string {
  return ROMAN[n] ?? String(n)
}

/** Era opener: rubricated Fell drop cap numeral + title + span + pressures. */
export function EraHeader({ era }: { era: Era }) {
  return (
    <header className="ml-2 flex items-baseline gap-4 pt-10 pb-3" data-era-id={era.id}>
      <span
        className="font-fell text-[44px] leading-none text-thread select-none"
        aria-hidden="true"
      >
        {toRoman(era.ordinal + 1)}
      </span>
      <div className="min-w-0">
        <h2 className="text-[19px] font-semibold leading-tight">
          {era.title}
          <span className="ml-3 font-data text-[13px] font-normal text-ink-faded">
            {formatYearRange(era.startYear, era.endYear)}
          </span>
        </h2>
        <p className="mt-0.5 text-[15px] text-ink-faded">{era.summary}</p>
        {era.pressures.length > 0 && (
          <p className="mt-1 font-data text-[12px] text-ink-faded">
            pressures:{' '}
            {era.pressures.map((p, i) => (
              <span key={p.name} title={p.description}>
                {i > 0 && ' · '}
                {p.name.toLowerCase()} ({p.intensity})
              </span>
            ))}
          </p>
        )}
      </div>
    </header>
  )
}
