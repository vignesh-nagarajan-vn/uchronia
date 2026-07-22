import { loadBaseline } from '@uchronia/core'
import { LENSES } from '@uchronia/schemas'
import { Hono } from 'hono'
import type { ServerDeps } from '../deps.js'

export function metaRoutes(deps: ServerDeps): Hono {
  const app = new Hono()

  app.get('/health', (c) => c.json({ ok: true, mock: deps.config.mock }))

  app.get('/config', (c) =>
    c.json({
      mock: deps.config.mock,
      // Boolean only — the key value never leaves config (§F12).
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

  return app
}
