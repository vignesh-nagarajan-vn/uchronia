import { useReducedMotion } from 'motion/react'
import {
  approximateThreadLength,
  computeThreadPath,
  type ThreadPin,
} from '../lib/thread-geometry.js'

export interface Thread {
  from: ThreadPin
  to: ThreadPin
  key: string
}

/**
 * The signature element (§7.4): literal red threads to causal ancestors and
 * descendants, drawn over the ledger. Draw-on ~300ms via dashoffset; instant
 * under prefers-reduced-motion. Pointer-transparent.
 */
export function ThreadOverlay({ threads, height }: { threads: Thread[]; height: number }) {
  const reduced = useReducedMotion()
  if (threads.length === 0) return null
  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 z-10 w-full overflow-visible"
      height={height}
      aria-hidden="true"
    >
      <title>causal threads</title>
      {threads.map((thread, i) => {
        const d = computeThreadPath(thread.from, thread.to, i % 3)
        const length = approximateThreadLength(thread.from, thread.to, i % 3)
        return (
          <g key={thread.key}>
            <path
              d={d}
              fill="none"
              stroke="var(--color-thread)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeDasharray={reduced ? undefined : length}
              strokeDashoffset={reduced ? undefined : length}
              style={
                reduced
                  ? undefined
                  : {
                      animation: `thread-draw 300ms ease-out forwards`,
                      animationDelay: `${i * 40}ms`,
                    }
              }
            />
            <circle cx={thread.from.x} cy={thread.from.y} r={2.5} fill="var(--color-thread)" />
            <circle cx={thread.to.x} cy={thread.to.y} r={2.5} fill="var(--color-thread)" />
          </g>
        )
      })}
      <style>{`@keyframes thread-draw { to { stroke-dashoffset: 0; } }`}</style>
    </svg>
  )
}
