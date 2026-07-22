import { Hono } from 'hono'
import type { ServerConfig } from './config.js'

/** Build the Hono app. Kept separate from the listener so tests can drive it directly. */
export function createApp(config: ServerConfig): Hono {
  const app = new Hono()

  app.get('/api/health', (c) =>
    c.json({
      ok: true,
      mock: config.mock,
    }),
  )

  return app
}
