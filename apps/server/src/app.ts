import {
  GenerationValidationError,
  IntegrityError,
  NotFoundError,
  PreForkImmutableError,
  ProviderAuthError,
  ProviderError,
} from '@uchronia/core'
import { Hono } from 'hono'
import { ZodError } from 'zod'
import type { ServerDeps } from './deps.js'
import { ApiError } from './http-error.js'
import { branchRoutes } from './routes/branches.js'
import { expandRoutes } from './routes/expand.js'
import { generateRoutes } from './routes/generate.js'
import { metaRoutes } from './routes/meta.js'
import { timelineRoutes } from './routes/timelines.js'

/** Build the Hono app around injected deps. Tests drive it directly. */
export function createApp(deps: ServerDeps): Hono {
  const app = new Hono()

  app.route('/api', metaRoutes(deps))
  app.route('/api', timelineRoutes(deps))
  app.route('/api', branchRoutes(deps))
  app.route('/api', generateRoutes(deps))
  app.route('/api', expandRoutes(deps))

  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json({ error: err.code, message: err.message }, err.status as 404)
    }
    if (err instanceof ZodError) {
      return c.json(
        {
          error: 'invalid-request',
          issues: err.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
        },
        400,
      )
    }
    if (err instanceof NotFoundError) {
      return c.json({ error: err.code, message: err.message }, 404)
    }
    if (err instanceof IntegrityError || err instanceof PreForkImmutableError) {
      return c.json({ error: err.code, message: err.message }, 409)
    }
    if (err instanceof GenerationValidationError) {
      return c.json({ error: err.code, message: err.message, issues: err.issues }, 502)
    }
    if (err instanceof ProviderError) {
      const status = err instanceof ProviderAuthError ? 503 : 502
      return c.json({ error: err.code, message: err.message }, status)
    }
    console.error('unhandled error', err)
    return c.json({ error: 'internal', message: 'something went wrong on our side' }, 500)
  })

  return app
}
