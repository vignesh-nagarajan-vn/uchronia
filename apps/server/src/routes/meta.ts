import { armsSvg, loadBaseline, UchroniaError } from '@uchronia/core'
import { LENSES } from '@uchronia/schemas'
import { Hono } from 'hono'
import type { ServerDeps } from '../deps.js'
import { callerKey, grantUnlock, isOwner, isUnlocked, passphraseMatches } from '../gate.js'

export function metaRoutes(deps: ServerDeps): Hono {
  const app = new Hono()
  // "Demo" is the user-facing name for the deterministic mock engine; the
  // boolean stays for compatibility with existing clients and scripts.
  const mode = deps.config.mock ? ('demo' as const) : ('live' as const)

  app.get('/health', (c) => c.json({ ok: true, mock: deps.config.mock, mode }))

  app.get('/config', (c) =>
    c.json({
      mock: deps.config.mock,
      mode,
      // Boolean only - the key value never leaves config (§F12).
      keyConfigured: deps.config.apiKey !== undefined,
      models: deps.config.models,
      defaults: {
        dial: 50,
        horizonYears: 150,
        lenses: [...LENSES],
      },
      // The deployment posture (v2/M24, extended v2.1/M26), so the UI can say
      // why it cannot derive rather than failing at the first click.
      gated: deps.config.accessToken !== undefined,
      unlocked: isUnlocked(c, deps.config),
      // Whose allowance this caller spends. On a public instance `unlocked` is
      // true for everyone (there is no passphrase to give), so it cannot carry
      // this distinction and the UI would call a visitor the owner.
      owner: isOwner(c, deps.config),
      // True when anonymous visitors may derive on this instance's key.
      publicLive: deps.config.publicLive,
      dailyBudget: deps.budget?.status(deps.clock.now()) ?? null,
      // This caller's own remaining share, so the composer can show it before
      // the run rather than as a 429 halfway through. Null when they are not
      // metered: an unlocked session, or an instance with no per-visitor cap.
      visitorBudget: isOwner(c, deps.config)
        ? null
        : (deps.visitors?.status(callerKey(c), deps.clock.now()) ?? null),
    }),
  )

  // Unlock a gated instance (v2/M24). Always 200 with the verdict in the
  // body, never a header or a status that distinguishes "wrong passphrase"
  // from "no passphrase configured", and the passphrase is never echoed.
  app.post('/unlock', async (c) => {
    if (deps.config.accessToken === undefined) {
      return c.json({ ok: true, gated: false, message: 'this instance is not gated' })
    }
    const body = (await c.req.json().catch(() => ({}))) as { passphrase?: unknown }
    const given = typeof body.passphrase === 'string' ? body.passphrase : ''
    if (!passphraseMatches(deps.config.accessToken, given)) {
      return c.json({ ok: false, gated: true, message: 'that is not the passphrase' })
    }
    grantUnlock(c, deps.config)
    return c.json({ ok: true, gated: true, message: 'unlocked' })
  })

  app.get('/baseline', (c) => c.json(loadBaseline()))

  // Procedural heraldry (v2/M20). Pure and deterministic, so it is cacheable
  // forever and served rather than stored. The web app cannot import core
  // (web depends on schemas only), and the static exporter embeds the same
  // bytes, so one route feeds both surfaces.
  app.get('/arms/:slug', (c) => {
    const slug = c.req.param('slug').replace(/\.svg$/, '')
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
      return c.text('bad slug', 400)
    }
    const size = Number(c.req.query('size')) || 96
    c.header('Content-Type', 'image/svg+xml; charset=utf-8')
    c.header('Cache-Control', 'public, max-age=31536000, immutable')
    return c.body(armsSvg(slug, Math.max(16, Math.min(512, size))))
  })

  // A deliberate 1-token spend proving the configured key works end to end.
  // Always 200: the body carries the verdict. Nothing secret ever leaves.
  app.post('/live-check', async (c) => {
    if (deps.config.mock || !deps.livePing) {
      return c.json({
        ok: false,
        mode: 'demo',
        error: 'the engine is in demo mode; configure ANTHROPIC_API_KEY server-side to go live',
      })
    }
    const started = Date.now()
    try {
      const { model } = await deps.livePing()
      return c.json({ ok: true, mode: 'live', model, latencyMs: Date.now() - started })
    } catch (error) {
      const message =
        error instanceof UchroniaError
          ? `${error.code}: ${error.message}`
          : 'the live check failed for an unexpected reason'
      return c.json({ ok: false, mode: 'live', error: message, latencyMs: Date.now() - started })
    }
  })

  return app
}
