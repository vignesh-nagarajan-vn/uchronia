import { describe, expect, it } from 'vitest'
import { loadConfig } from './config.js'
import { SHOWCASE_FILES, seedDemoIfEmpty } from './seed-demo.js'
import { makeTestApp } from './test-helpers.js'

describe('demo seeding', () => {
  it('imports every showcase chronicle into an empty database, once', () => {
    const { deps } = makeTestApp()
    expect(seedDemoIfEmpty(deps)).toBe(true)
    const list = deps.repo.listTimelines()
    expect(list).toHaveLength(SHOWCASE_FILES.length)
    for (const timeline of list) expect(timeline.eventCount).toBeGreaterThan(0)
    // A database with content is left alone.
    expect(seedDemoIfEmpty(deps)).toBe(false)
    expect(deps.repo.listTimelines()).toHaveLength(SHOWCASE_FILES.length)
  })

  it('skips an unreadable ledger rather than refusing to boot', () => {
    const { deps } = makeTestApp()
    expect(seedDemoIfEmpty(deps, [{ formatVersion: 1, nonsense: true }])).toBe(false)
    expect(deps.repo.listTimelines()).toHaveLength(0)
  })
})

describe('serverless (Vercel) defaults', () => {
  it('drops the database into /tmp, paces the mock, and seeds the demo', () => {
    const config = loadConfig({ VERCEL: '1' } as NodeJS.ProcessEnv)
    expect(config.mock).toBe(true)
    expect(config.dbPath.replace(/\\/g, '/')).toContain('/tmp/uchronia.db')
    expect(config.mockPaceMs).toBe(250)
    expect(config.seedDemo).toBe(true)
  })

  it('leaves local development untouched', () => {
    const config = loadConfig({
      UCHRONIA_MOCK: '1',
      UCHRONIA_DB: ':memory:',
    } as NodeJS.ProcessEnv)
    expect(config.seedDemo).toBe(false)
    expect(config.mockPaceMs).toBe(0)
  })

  it('respects explicit overrides on Vercel', () => {
    const config = loadConfig({
      VERCEL: '1',
      UCHRONIA_SEED_DEMO: '0',
      UCHRONIA_MOCK_PACE_MS: '0',
      UCHRONIA_DB: ':memory:',
    } as NodeJS.ProcessEnv)
    expect(config.seedDemo).toBe(false)
    expect(config.mockPaceMs).toBe(0)
    expect(config.dbPath).toBe(':memory:')
  })
})
