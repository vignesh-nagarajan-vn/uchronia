/**
 * The Vercel entry: the whole Hono app behind one Node-style (req, res)
 * handler, prebundled to plain ESM by esbuild (see vercel.json's
 * buildCommand and docs/DEPLOY.md).
 *
 * The bridge below is deliberately hand-rolled. Vercel's Node runtime both
 * invokes the function (req, res)-style (its web-handler detection cannot see
 * through the re-export into the bundle) and pre-consumes the request stream
 * to offer `req.body`, so neither hono/vercel (fetch-shaped; never answers)
 * nor a plain getRequestListener (waits forever on the drained stream for any
 * POST) survives contact with it. This bridge builds the web Request itself,
 * reconstructing the body from the runtime's buffer when the stream is gone,
 * and streams the Response back out so SSE frames flush as they happen.
 *
 * Module scope runs once per warm instance: the SQLite database (/tmp on
 * Vercel, per config defaults), migrations, and the showcase seed all happen
 * on cold start and are reused across requests on that instance. Serverless
 * state is ephemeral and per-instance by design: a playground, not an
 * archive. See docs/DEPLOY.md and ADR-0003 before pointing a key at this.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import alexandriaLedger from '../../../demo/the-alexandrian-inheritance.uchronia.json' with {
  type: 'json',
}
import alliesLedger from '../../../demo/the-allies-lose.uchronia.json' with { type: 'json' }
import armadaLedger from '../../../demo/the-armada-lands.uchronia.json' with { type: 'json' }
import demoLedger from '../../../demo/the-unburnt-library.uchronia.json' with { type: 'json' }
import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { createDeps } from './deps.js'
import { seedDemoIfEmpty } from './seed-demo.js'

const serverConfig = loadConfig()
let deps: ReturnType<typeof createDeps>
try {
  deps = createDeps(serverConfig)
} catch (error) {
  // A boot failure here would otherwise surface as an opaque
  // FUNCTION_INVOCATION_FAILED; make the cause readable in the function logs.
  console.error(`cold start failed opening ${serverConfig.dbPath}`, error)
  throw error
}
if (serverConfig.seedDemo) {
  try {
    seedDemoIfEmpty(deps, [demoLedger, alexandriaLedger, armadaLedger, alliesLedger])
  } catch (error) {
    console.warn('demo seeding failed; continuing with an empty ledger', error)
  }
}

const app = createApp(deps)

type VercelRequest = IncomingMessage & { body?: unknown }

async function readBody(req: VercelRequest): Promise<string | Uint8Array | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined
  // Vercel's helpers already drained the stream and parked the result on
  // req.body (a string, Buffer, or parsed JSON object, by content-type).
  if (req.body !== undefined) {
    if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) return req.body
    return JSON.stringify(req.body)
  }
  // Helpers absent (local harness, other hosts): the stream is still live.
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined
}

export default async function handler(req: VercelRequest, res: ServerResponse): Promise<void> {
  const headers = new Headers()
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    const name = req.rawHeaders[i]
    const value = req.rawHeaders[i + 1]
    if (name !== undefined && value !== undefined) headers.append(name, value)
  }
  const url = `https://${req.headers.host ?? 'uchronia.local'}${req.url ?? '/'}`
  const response = await app.fetch(
    new Request(url, { method: req.method ?? 'GET', headers, body: await readBody(req) }),
  )

  res.statusCode = response.status
  response.headers.forEach((value, name) => {
    // Node owns chunked framing; copying this header in conflicts with it.
    if (name.toLowerCase() !== 'transfer-encoding') res.setHeader(name, value)
  })
  if (response.body) {
    // Write chunks as they arrive so SSE streams instead of buffering.
    for await (const chunk of response.body) res.write(chunk)
  }
  res.end()
}
