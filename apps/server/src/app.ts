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
import { DailyBudget, spendingGate, VisitorLedger } from './gate.js'
import { ApiError } from './http-error.js'
import { meterProvider } from './metering.js'
import { artifactRoutes } from './routes/artifacts.js'
import { askRoutes } from './routes/ask.js'
import { branchRoutes } from './routes/branches.js'
import { expandRoutes } from './routes/expand.js'
import { forkRoutes } from './routes/fork.js'
import { generateRoutes } from './routes/generate.js'
import { historiographyRoutes } from './routes/historiography.js'
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

  // Everything that can reach the provider sits behind the gate (v2/M24).
  // Reads, exports, the book, the map, and the record are deliberately
  // outside it: a locked instance is still a fully readable one.
  const budget = new DailyBudget(deps.config.dailyTokenBudget)
  const visitors = new VisitorLedger(deps.config.visitorTokenBudget)
  deps.budget = budget
  deps.visitors = visitors
  // Every provider call charges both ledgers (v2.1/M26). Wrapping here rather
  // than in createDeps keeps tests free to inject a bare provider and still
  // exercise the metering through the app they build.
  deps.provider = meterProvider(deps.provider, budget, visitors, deps.clock)
  const gate = spendingGate(deps.config, budget, visitors, deps.clock)
  for (const path of [
    '/api/timelines/interpret',
    '/api/branches/:id/generate',
    '/api/branches/:branchId/events/:eventId/expand',
    '/api/branches/:branchId/eras/:eraId/expand',
    '/api/branches/:branchId/entities/:entityId/biography',
    '/api/branches/:branchId/events/:eventId/regenerate',
    '/api/branches/:branchId/events/:eventId/artifacts',
    '/api/branches/:branchId/events/:eventId/pulse',
    '/api/branches/:branchId/events/:eventId/interpretations',
    '/api/branches/:branchId/schools',
    '/api/branches/:branchId/ask',
    '/api/branches/:branchId/inquiry',
    '/api/branches/:id/fork',
  ]) {
    app.use(path, gate)
  }

  app.route('/api', metaRoutes(deps))
  app.route('/api', timelineRoutes(deps))
  app.route('/api', branchRoutes(deps))
  app.route('/api', generateRoutes(deps))
  app.route('/api', expandRoutes(deps))
  app.route('/api', forkRoutes(deps))
  app.route('/api', pulseRoutes(deps))
  app.route('/api', historiographyRoutes(deps))
  app.route('/api', askRoutes(deps))
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
