import { describe, expect, it } from 'vitest'
import { loadConfig } from './config.js'
import { seedDemoIfEmpty } from './seed-demo.js'
import { makeTestApp } from './test-helpers.js'

describe('demo seeding', () => {
  it('imports the showcase chronicle into an empty database, once', () => {
    const { deps } = makeTestApp()
    expect(seedDemoIfEmpty(deps)).toBe(true)
    const list = deps.repo.listTimelines()
    expect(list).toHaveLength(1)
    expect(list[0]?.eventCount).toBe(67)
    // A database with content is left alone.
    expect(seedDemoIfEmpty(deps)).toBe(false)
    expect(deps.repo.listTimelines()).toHaveLength(1)
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
