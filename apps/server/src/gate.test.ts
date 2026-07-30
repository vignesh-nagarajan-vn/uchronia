import { fixedClock, type LLMProvider, MockProvider, sequentialIdGen } from '@uchronia/core'
import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { openDatabase } from './db/client.js'
import { Repo } from './db/repo.js'
import type { ServerDeps } from './deps.js'
import { DailyBudget, passphraseMatches, VisitorLedger } from './gate.js'
import { type Caller, callerContext } from './metering.js'

/**
 * The spending gate (v2/M24). This is the milestone that stands between a
 * stranger and the owner's invoice, so the tests are about the failure
 * directions rather than the happy path.
 */

const NOW = '2026-07-30T12:00:00.000Z'

function appWith(env: Record<string, string>, provider: LLMProvider = new MockProvider()) {
  const config = loadConfig({ UCHRONIA_DB: ':memory:', ...env })
  const deps: ServerDeps = {
    config,
    repo: new Repo(openDatabase(':memory:')),
    provider,
    idgen: sequentialIdGen('GT'),
    clock: fixedClock(NOW),
  }
  return { app: createApp(deps), config, deps }
}

/**
 * The mock meters nothing, so a test that wants to watch the ledgers move has
 * to supply the usage itself. This also records who the provider was told it
 * was working for, which is the claim worth proving: attribution has to
 * survive from the middleware into an SSE stream that outlives it.
 */
class MeteredMock implements LLMProvider {
  readonly mode: LLMProvider['mode']
  readonly callers: (Caller | undefined)[] = []
  private readonly inner = new MockProvider()

  constructor(private readonly tokensPerCall = 100) {
    this.mode = this.inner.mode
  }

  async complete(request: Parameters<LLMProvider['complete']>[0]) {
    this.callers.push(callerContext.getStore())
    const result = await this.inner.complete(request)
    return { ...result, usage: { inputTokens: this.tokensPerCall, outputTokens: 0 } }
  }
}

describe('the deployment posture (v2/M24)', () => {
  it('refuses to go live on serverless without a passphrase, and serves the demo instead', () => {
    const { config } = appWith({ VERCEL: '1', ANTHROPIC_API_KEY: 'sk-ant-not-a-real-key' })
    // The fail-safe direction: the key is present and deliberately unused.
    expect(config.liveAllowed).toBe(false)
    expect(config.mock).toBe(true)
    expect(config.apiKey).toBeUndefined()
    expect(config.publicLive).toBe(false)
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
    // A passphrase instance has no visitors, so it has no per-visitor cap.
    expect(config.visitorTokenBudget).toBe(0)
  })

  it('goes live for visitors when the public posture is opted into explicitly', () => {
    const { config } = appWith({
      VERCEL: '1',
      ANTHROPIC_API_KEY: 'sk-ant-not-a-real-key',
      UCHRONIA_PUBLIC_LIVE: '1',
    })
    expect(config.liveAllowed).toBe(true)
    expect(config.mock).toBe(false)
    expect(config.publicLive).toBe(true)
    // Turning it on cannot leave it unmetered.
    expect(config.visitorTokenBudget).toBeGreaterThan(0)
    expect(config.dailyTokenBudget).toBeGreaterThan(0)
    expect(config.rateLimitPerMinute).toBeGreaterThan(0)
    // And a single run may not outlast one visitor's whole allowance.
    expect(config.maxRunTokens).toBeLessThanOrEqual(config.visitorTokenBudget)
  })

  it('never reports a public posture on an instance that cannot spend at all', () => {
    const { config } = appWith({ VERCEL: '1', UCHRONIA_PUBLIC_LIVE: '1' })
    expect(config.mock).toBe(true)
    expect(config.publicLive).toBe(false)
    expect(config.visitorTokenBudget).toBe(0)
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
    expect(body.owner).toBe(false)
    expect(body.publicLive).toBe(false)
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

describe('the public posture (v2.1/M26)', () => {
  const publicLive = {
    VERCEL: '1',
    ANTHROPIC_API_KEY: 'sk-ant-not-a-real-key',
    UCHRONIA_PUBLIC_LIVE: '1',
  }

  const interpret = (app: ReturnType<typeof createApp>, headers: Record<string, string> = {}) =>
    app.request('/api/timelines/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ podText: 'What if Rome held?' }),
    })

  it('admits an anonymous visitor instead of refusing them', async () => {
    const { app } = appWith(publicLive, new MeteredMock())
    const res = await interpret(app)
    expect(res.status).toBe(200)
  })

  it('calls a visitor a visitor on /api/config, though nothing is barring them', async () => {
    const { app } = appWith(publicLive, new MeteredMock())
    const body = (await (await app.request('/api/config')).json()) as Record<string, unknown>
    expect(body.publicLive).toBe(true)
    // No passphrase exists, so nothing is locked...
    expect(body.gated).toBe(false)
    expect(body.unlocked).toBe(true)
    // ...but they are still spending a visitor's share, not the owner's.
    expect(body.owner).toBe(false)
    expect(body.visitorBudget).toMatchObject({ spent: 0 })
  })

  it('charges what a visitor spends to their own ledger and to the day', async () => {
    const { app, deps } = appWith(publicLive, new MeteredMock())
    await interpret(app, { 'x-forwarded-for': '198.51.100.7' })

    const day = deps.budget?.status(new Date(NOW))
    expect(day?.spent).toBeGreaterThan(0)
    const mine = deps.visitors?.status('198.51.100.7', new Date(NOW))
    expect(mine?.spent).toBe(day?.spent)
    // One visitor's spending is not another's problem.
    expect(deps.visitors?.status('203.0.113.9', new Date(NOW))?.spent).toBe(0)
  })

  it('turns a visitor away once their share is gone, while the instance still has budget', async () => {
    const { app, deps } = appWith(
      // One interpretation is a single 100-token call, so this allowance is
      // gone after exactly one, and the instance budget is switched off to
      // prove the refusal comes from the visitor's share and not the day's.
      { ...publicLive, UCHRONIA_VISITOR_TOKEN_BUDGET: '50', UCHRONIA_DAILY_TOKEN_BUDGET: '0' },
      new MeteredMock(),
    )
    const ip = { 'x-forwarded-for': '198.51.100.7' }
    expect((await interpret(app, ip)).status).toBe(200)

    const spent = deps.visitors?.status('198.51.100.7', new Date(NOW))?.spent ?? 0
    expect(spent).toBeGreaterThanOrEqual(50)

    const second = await interpret(app, ip)
    expect(second.status).toBe(429)
    expect(((await second.json()) as { error: string }).error).toBe('visitor-budget-exhausted')

    // A different visitor is unaffected: the cap is per caller, not global.
    expect((await interpret(app, { 'x-forwarded-for': '203.0.113.9' })).status).toBe(200)
  })

  it('does not charge an unlocked session against a visitor share', async () => {
    const { app, deps } = appWith(
      { ...publicLive, UCHRONIA_ACCESS_TOKEN: 'open sesame' },
      new MeteredMock(),
    )
    const unlock = await app.request('/api/unlock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passphrase: 'open sesame' }),
    })
    const cookie = (unlock.headers.get('set-cookie') ?? '').split(';')[0] ?? ''
    await interpret(app, { cookie, 'x-forwarded-for': '198.51.100.7' })

    // The day's ledger is the invoice and nobody skips it...
    expect(deps.budget?.status(new Date(NOW))?.spent).toBeGreaterThan(0)
    // ...but the owner is not a visitor and holds no visitor's share.
    expect(deps.visitors?.status('198.51.100.7', new Date(NOW))?.spent).toBe(0)
  })

  it('keeps the caller attributed through the whole SSE run, not just the request', async () => {
    const provider = new MeteredMock()
    const { app, deps } = appWith(publicLive, provider)
    const created = await app.request('/api/timelines', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.7' },
      body: JSON.stringify({ podText: 'The Library of Alexandria never burns in 48 BC' }),
    })
    const { rootBranch } = (await created.json()) as { rootBranch: { id: string } }

    const res = await app.request(`/api/branches/${rootBranch.id}/generate`, {
      method: 'POST',
      headers: { 'x-forwarded-for': '198.51.100.7' },
    })
    await res.text() // drain the stream to completion

    // The generation loop runs inside a stream that outlives the middleware.
    // Every call it made must still have known whose budget it was spending.
    const during = provider.callers.slice(-40)
    expect(during.length).toBeGreaterThan(1)
    expect(during.every((caller) => caller?.key === '198.51.100.7')).toBe(true)
    expect(deps.visitors?.status('198.51.100.7', new Date(NOW))?.spent).toBeGreaterThan(0)
  })

  it('still lets a passphrase instance refuse anonymous callers', async () => {
    const { app } = appWith({
      VERCEL: '1',
      ANTHROPIC_API_KEY: 'sk-ant-not-a-real-key',
      UCHRONIA_ACCESS_TOKEN: 'open sesame',
    })
    expect((await interpret(app)).status).toBe(401)
  })
})

describe('the visitor ledger', () => {
  it('meters each caller separately and rolls over at the UTC date', () => {
    const ledger = new VisitorLedger(1000)
    const day1 = new Date('2026-07-30T23:59:00.000Z')
    ledger.record('a', 900, day1)
    ledger.record('b', 100, day1)
    expect(ledger.exhausted('a', day1)).toBe(false)
    ledger.record('a', 100, day1)
    expect(ledger.exhausted('a', day1)).toBe(true)
    expect(ledger.exhausted('b', day1)).toBe(false)

    const day2 = new Date('2026-07-31T00:01:00.000Z')
    expect(ledger.exhausted('a', day2)).toBe(false)
    expect(ledger.status('a', day2)).toMatchObject({ spent: 0, remaining: 1000 })
  })

  it('meters nobody when uncapped, and says so rather than reporting a number', () => {
    const ledger = new VisitorLedger(0)
    ledger.record('a', 9_000_000, new Date(NOW))
    expect(ledger.exhausted('a', new Date(NOW))).toBe(false)
    expect(ledger.status('a', new Date(NOW))).toBeNull()
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
