import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TimelineAggregate } from '@uchronia/schemas'
import type { ServerDeps } from './deps.js'

/**
 * Import the showcase chronicle into an empty database, so a fresh deployment
 * (or an ephemeral serverless instance) greets its first visitor with content
 * instead of a blank atlas. A database with any timeline is left alone.
 *
 * The serverless bundle passes the ledger directly (esbuild inlines the JSON,
 * so no file needs to survive tracing); every other edition reads it from the
 * demo/ directory on disk.
 */
export function seedDemoIfEmpty(deps: ServerDeps, provided?: unknown): boolean {
  if (deps.repo.listTimelines().length > 0) return false
  let raw: unknown
  let source: string
  if (provided !== undefined) {
    raw = provided
    source = 'the bundled ledger'
  } else {
    const candidates = [
      join(process.cwd(), 'demo', 'the-unburnt-library.uchronia.json'),
      join(process.cwd(), '..', '..', 'demo', 'the-unburnt-library.uchronia.json'),
    ]
    const path = candidates.find((c) => existsSync(c))
    if (!path) {
      console.warn('seed requested but no demo ledger found near', process.cwd())
      return false
    }
    raw = JSON.parse(readFileSync(path, 'utf8'))
    source = path
  }
  const aggregate = TimelineAggregate.parse(raw)
  deps.repo.saveAggregate(aggregate)
  console.log(`seeded the showcase chronicle (${aggregate.events.length} events) from ${source}`)
  return true
}
