import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TimelineAggregate } from '@uchronia/schemas'
import type { ServerDeps } from './deps.js'

/** The showcase chronicles, in the order the Atlas offers them (v2/M25). */
export const SHOWCASE_FILES = [
  'the-unburnt-library.uchronia.json',
  'the-alexandrian-inheritance.uchronia.json',
  'the-armada-lands.uchronia.json',
  'the-allies-lose.uchronia.json',
] as const

/**
 * Import the showcase chronicles into an empty database, so a fresh
 * deployment (or an ephemeral serverless instance) greets its first visitor
 * with content instead of a blank atlas. A database with any timeline is
 * left alone.
 *
 * The serverless bundle passes the ledgers directly (esbuild inlines the
 * JSON, so no file needs to survive tracing); every other edition reads them
 * from the demo/ directory on disk. A ledger that fails to parse is skipped
 * with a warning rather than taking the boot down with it: seeding is a
 * courtesy, and an app that will not start is worse than a thin atlas.
 */
export function seedDemoIfEmpty(deps: ServerDeps, provided?: readonly unknown[]): boolean {
  if (deps.repo.listTimelines().length > 0) return false

  const ledgers: Array<{ raw: unknown; source: string }> = []
  if (provided !== undefined) {
    for (const [i, raw] of provided.entries()) {
      ledgers.push({ raw, source: `the bundled ledger ${i + 1}` })
    }
  } else {
    for (const file of SHOWCASE_FILES) {
      const path = [
        join(process.cwd(), 'demo', file),
        join(process.cwd(), '..', '..', 'demo', file),
      ].find((c) => existsSync(c))
      if (path) ledgers.push({ raw: JSON.parse(readFileSync(path, 'utf8')), source: path })
    }
    if (ledgers.length === 0) {
      console.warn('seed requested but no demo ledger found near', process.cwd())
      return false
    }
  }

  let seeded = 0
  let events = 0
  for (const ledger of ledgers) {
    const parsed = TimelineAggregate.safeParse(ledger.raw)
    if (!parsed.success) {
      console.warn(`skipped an unreadable showcase ledger (${ledger.source})`)
      continue
    }
    deps.repo.saveAggregate(parsed.data)
    seeded += 1
    events += parsed.data.events.length
  }
  if (seeded === 0) return false
  console.log(`seeded ${seeded} showcase chronicle(s), ${events} events in all`)
  return true
}
