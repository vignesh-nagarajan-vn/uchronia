import { fixedClock, MockProvider, sequentialIdGen } from '@uchronia/core'
import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { openDatabase } from './db/client.js'
import { Repo } from './db/repo.js'
import type { ServerDeps } from './deps.js'
import { DailyBudget, passphraseMatches } from './gate.js'

/**
 * The spending gate (v2/M24). This is the milestone that stands between a
 * stranger and the owner's invoice, so the tests are about the failure
 * directions rather than the happy path.
 */

const NOW = '2026-07-30T12:00:00.000Z'

function appWith(env: Record<string, string>) {
  const config = loadConfig({ UCHRONIA_DB: ':memory:', ...env })
  const deps: ServerDeps = {
    config,
    repo: new Repo(openDatabase(':memory:')),
    provider: new MockProvider(),
    idgen: sequentialIdGen('GT'),
    clock: fixedClock(NOW),
  }
  return { app: createApp(deps), config, deps }
}

describe('the deployment posture (v2/M24)', () => {
  it('refuses to go live on serverless without a passphrase, and serves the demo instead', () => {
    const { config } = appWith({ VERCEL: '1', ANTHROPIC_API_KEY: 'sk-ant-not-a-real-key' })
    // The fail-safe direction: the key is present and deliberately unused.
    expect(config.liveAllowed).toBe(false)
    expect(config.mock).toBe(true)
    expect(config.apiKey).toBeUndefined()
  })

  it('goes live on serverless once a passphrase is configured', () => {
    const { config } = appWith({
      VERCEL: '1',
      ANTHROPIC_API_KEY: 'sk-ant-not-a-real-key',
      UCHRONIA_ACCESS_TOKEN: 'open sesame',
    })
    expect(config.liveAllowed).toBe(true)
    expect(config.mock).toBe(false)
  })

  it('trusts a local key without a passphrase: the owner is the only caller', () => {
    const { config } = appWith({ ANTHROPIC_API_KEY: 'sk-ant-not-a-real-key' })
    expect(config.liveAllowed).toBe(true)
    expect(config.mock).toBe(false)
    expect(config.rateLimitPerMinute).toBe(0)
    expect(config.dailyTokenBudget).toBe(0)
  })

  it('defaults serverless to a rate limit and a daily cap', () => {
    const { config } = appWith({
      VERCEL: '1',
      ANTHROPIC_API_KEY: 'sk-ant-not-a-real-key',
      UCHRONIA_ACCESS_TOKEN: 'open sesame',
    })
    expect(config.rateLimitPerMinute).toBeGreaterThan(0)
    expect(config.dailyTokenBudget).toBeGreaterThan(0)
  })
})

describe('the gate over HTTP', () => {
  const gated = {
    VERCEL: '1',
    ANTHROPIC_API_KEY: 'sk-ant-not-a-real-key',
    UCHRONIA_ACCESS_TOKEN: 'open sesame',
  }

  it('locks the routes that spend and leaves the readable ones open', async () => {
    const { app } = appWith(gated)
    const locked = await app.request('/api/timelines/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ podText: 'What if Rome held?' }),
    })
    expect(locked.status).toBe(401)
    expect(((await locked.json()) as { error: string }).error).toBe('locked')

    // Reading is never gated: a locked instance is still a readable one.
    for (const path of ['/api/config', '/api/health', '/api/baseline', '/api/timelines']) {
      expect((await app.request(path)).status, path).toBe(200)
    }
  })

  it('unlocks with the passphrase and refuses anything else, saying nothing either way', async () => {
    const { app } = appWith(gated)
    const wrong = await app.request('/api/unlock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passphrase: 'open sesamf' }),
    })
    // Always 200 with the verdict in the body: the status must not become an
    // oracle for whether a passphrase is configured.
    expect(wrong.status).toBe(200)
    expect((await wrong.json()) as { ok: boolean }).toMatchObject({ ok: false })
    expect(wrong.headers.get('set-cookie')).toBeNull()

    const right = await app.request('/api/unlock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passphrase: 'open sesame' }),
    })
    expect(right.status).toBe(200)
    const cookie = right.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('uchronia_unlocked')
    expect(cookie.toLowerCase()).toContain('httponly')
  })

  it('lets an unlocked session through the gate', async () => {
    const { app } = appWith(gated)
    const unlock = await app.request('/api/unlock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passphrase: 'open sesame' }),
    })
    const cookie = (unlock.headers.get('set-cookie') ?? '').split(';')[0] ?? ''
    const res = await app.request('/api/timelines/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ podText: 'What if Rome held?' }),
    })
    // Past the gate. It fails afterwards only because the fake key cannot
    // reach the provider, which is a different failure and a later one.
    expect(res.status).not.toBe(401)
  })

  it('reports its posture on /api/config without leaking the passphrase', async () => {
    const { app } = appWith(gated)
    const body = (await (await app.request('/api/config')).json()) as Record<string, unknown>
    expect(body.gated).toBe(true)
    expect(body.unlocked).toBe(false)
    expect(JSON.stringify(body)).not.toContain('open sesame')
    expect(JSON.stringify(body)).not.toContain('sk-ant')
  })

  it('never gates a demo instance: there is nothing to spend', async () => {
    const { app } = appWith({ UCHRONIA_MOCK: '1' })
    const res = await app.request('/api/timelines/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ podText: 'What if Rome held?' }),
    })
    expect(res.status).toBe(200)
  })
})

describe('the passphrase compare', () => {
  it('accepts only the exact string, including length', () => {
    expect(passphraseMatches('open sesame', 'open sesame')).toBe(true)
    expect(passphraseMatches('open sesame', 'open sesam')).toBe(false)
    expect(passphraseMatches('open sesame', 'open sesamee')).toBe(false)
    expect(passphraseMatches('open sesame', '')).toBe(false)
    expect(passphraseMatches('', '')).toBe(true)
  })
})

describe('the daily ledger', () => {
  it('accumulates, exhausts, and rolls over at the UTC date', () => {
    const budget = new DailyBudget(1000)
    const day1 = new Date('2026-07-30T23:59:00.000Z')
    expect(budget.exhausted(day1)).toBe(false)
    budget.record(600, day1)
    expect(budget.exhausted(day1)).toBe(false)
    budget.record(500, day1)
    expect(budget.exhausted(day1)).toBe(true)
    expect(budget.status(day1)).toMatchObject({ limit: 1000, spent: 1100, remaining: 0 })

    const day2 = new Date('2026-07-31T00:01:00.000Z')
    expect(budget.exhausted(day2)).toBe(false)
    expect(budget.status(day2)).toMatchObject({ spent: 0 })
  })

  it('reports null rather than a very large number when uncapped', () => {
    const budget = new DailyBudget(0)
    budget.record(9_000_000, new Date(NOW))
    expect(budget.exhausted(new Date(NOW))).toBe(false)
    expect(budget.status(new Date(NOW))).toBeNull()
  })
})
