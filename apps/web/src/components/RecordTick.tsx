import type { BaselineAnchor } from '@uchronia/schemas'
import { formatYear } from '../lib/format.js'

/**
 * A baseline anchor on the record rail (F7): unmistakably *record*, not ink —
 * mono, Prussian blue, non-interactive.
 */
export function RecordTick({ anchor }: { anchor: BaselineAnchor }) {
  return (
    <div className="flex items-baseline gap-3 py-1 pl-0 pr-3">
      <span className="w-[72px] shrink-0 text-right font-data text-[12px] text-record">
        {formatYear(anchor.year)}
      </span>
      <span
        className="min-w-0 truncate font-data text-[12px] text-record/80"
        title={anchor.summary}
      >
        — {anchor.title}
      </span>
    </div>
  )
}
