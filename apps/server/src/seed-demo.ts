import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TimelineAggregate } from '@uchronia/schemas'
import type { ServerDeps } from './deps.js'

/**
 * Import the showcase chronicle into an empty database, so a fresh deployment
 * (or an ephemeral serverless instance) greets its first visitor with content
 * instead of a blank atlas. A database with any timeline is left alone.
 */
export function seedDemoIfEmpty(deps: ServerDeps): boolean {
  if (deps.repo.listTimelines().length > 0) return false
  const candidates = [
    join(process.cwd(), 'demo', 'the-unburnt-library.uchronia.json'),
    join(process.cwd(), '..', '..', 'demo', 'the-unburnt-library.uchronia.json'),
  ]
  const path = candidates.find((c) => existsSync(c))
  if (!path) {
    console.warn('seed requested but no demo ledger found near', process.cwd())
    return false
  }
  const aggregate = TimelineAggregate.parse(JSON.parse(readFileSync(path, 'utf8')))
  deps.repo.saveAggregate(aggregate)
  console.log(`seeded the showcase chronicle (${aggregate.events.length} events) from ${path}`)
  return true
}
