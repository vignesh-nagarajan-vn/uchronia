import {
  GenerationAbortedError,
  GenerationValidationError,
  IntegrityError,
  NotFoundError,
  PreForkImmutableError,
  ProviderAuthError,
  ProviderError,
} from '@uchronia/core'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { ZodError } from 'zod'
import type { ServerDeps } from './deps.js'
import { ApiError } from './http-error.js'
import { artifactRoutes } from './routes/artifacts.js'
import { branchRoutes } from './routes/branches.js'
import { expandRoutes } from './routes/expand.js'
import { forkRoutes } from './routes/fork.js'
import { generateRoutes } from './routes/generate.js'
import { metaRoutes } from './routes/meta.js'
import { pulseRoutes } from './routes/pulse.js'
import { timelineRoutes } from './routes/timelines.js'
import { traceRoutes } from './routes/traces.js'

/** Imports are the largest legitimate bodies; a demo ledger is ~200 KB. */
const BODY_LIMIT_BYTES = 16 * 1024 * 1024

/** Build the Hono app around injected deps. Tests drive it directly. */
export function createApp(deps: ServerDeps): Hono {
  const app = new Hono()

  if (deps.config.corsOrigins.length > 0) {
    app.use('/api/*', cors({ origin: deps.config.corsOrigins }))
  }
  app.use(
    '/api/*',
    bodyLimit({
      maxSize: BODY_LIMIT_BYTES,
      onError: (c) =>
        c.json(
          { error: 'payload-too-large', message: 'request body exceeds the 16 MB limit' },
          413,
        ),
    }),
  )

  app.route('/api', metaRoutes(deps))
  app.route('/api', timelineRoutes(deps))
  app.route('/api', branchRoutes(deps))
  app.route('/api', generateRoutes(deps))
  app.route('/api', expandRoutes(deps))
  app.route('/api', forkRoutes(deps))
  app.route('/api', pulseRoutes(deps))
  app.route('/api', artifactRoutes(deps))
  app.route('/api', traceRoutes(deps))

  // One envelope for every error: { error, message, issues? }.
  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json({ error: err.code, message: err.message }, err.status as 404)
    }
    // c.req.json() throws SyntaxError on malformed bodies - client error, not ours.
    if (err instanceof SyntaxError) {
      return c.json({ error: 'invalid-json', message: 'request body is not valid JSON' }, 400)
    }
    if (err instanceof ZodError) {
      const issues = err.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      return c.json(
        { error: 'invalid-request', message: `request failed validation: ${issues[0]}`, issues },
        400,
      )
    }
    if (err instanceof NotFoundError) {
      return c.json({ error: err.code, message: err.message }, 404)
    }
    if (err instanceof IntegrityError || err instanceof PreForkImmutableError) {
      return c.json({ error: err.code, message: err.message }, 409)
    }
    if (err instanceof GenerationAbortedError) {
      return c.json({ error: err.code, message: err.message }, 400)
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
