import { armsSvg, loadBaseline, UchroniaError } from '@uchronia/core'
import { LENSES } from '@uchronia/schemas'
import { Hono } from 'hono'
import type { ServerDeps } from '../deps.js'

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
    }),
  )

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
