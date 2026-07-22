import { fixedClock, MockProvider, sequentialIdGen } from '@uchronia/core'
import type { Hono } from 'hono'
import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { openDatabase } from './db/client.js'
import { Repo } from './db/repo.js'
import type { ServerDeps } from './deps.js'

/** Fresh in-memory app with fully deterministic deps. */
export function makeTestApp(): { app: Hono; deps: ServerDeps } {
  const config = loadConfig({ UCHRONIA_MOCK: '1', UCHRONIA_DB: ':memory:' })
  const deps: ServerDeps = {
    config,
    repo: new Repo(openDatabase(':memory:')),
    provider: new MockProvider(),
    idgen: sequentialIdGen('TS'),
    clock: fixedClock('2026-07-22T12:00:00.000Z'),
  }
  return { app: createApp(deps), deps }
}

export async function postJson(app: Hono, path: string, body: unknown): Promise<Response> {
  return app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}
