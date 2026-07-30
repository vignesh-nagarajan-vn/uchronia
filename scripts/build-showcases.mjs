#!/usr/bin/env node
/**
 * Build the showcase chronicles (v2/M25).
 *
 * Each one is derived by the deterministic demo engine and exported to
 * demo/, so the Atlas can offer them keyless and Vercel can seed them. They
 * are DEMO-derived by design (ADR-0004: no key ever lands in this tree), and
 * ROADMAP records that plainly; re-deriving them live from the deployment is
 * the owner's call.
 *
 *   node scripts/build-showcases.mjs
 */
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 8799
const BASE = `http://127.0.0.1:${PORT}`

/** Each showcase: what it asks, how it derives, and where it lands. */
const SHOWCASES = [
  {
    file: 'the-alexandrian-inheritance.uchronia.json',
    title: 'The Alexandrian Inheritance',
    body: {
      podText: 'The Library of Alexandria never burns in 48 BC',
      title: 'The Alexandrian Inheritance',
      dial: 40,
      horizonYears: 220,
      epilogue: true,
    },
  },
  {
    file: 'the-armada-lands.uchronia.json',
    title: 'The Armada Lands',
    body: {
      podText: 'The Spanish Armada lands its army in England in 1588',
      title: 'The Armada Lands',
      dial: 50,
      horizonYears: 180,
      derivation: 'symposium',
      court: true,
    },
  },
  {
    file: 'the-allies-lose.uchronia.json',
    title: 'The Allies Lose',
    body: {
      podText:
        'The Allies lose the Second World War: Britain is forced out after the fall of France in 1940 and the Axis powers dictate the peace',
      title: 'The Allies Lose',
      dial: 55,
      horizonYears: 85,
      court: true,
    },
  },
]

async function waitForServer(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/health`)
      if (res.ok) return
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('the demo server never came up')
}

async function main() {
  const server = spawn(
    process.execPath,
    ['--import', 'tsx', join(root, 'apps/server/src/index.ts')],
    {
      cwd: join(root, 'apps/server'),
      env: {
        ...process.env,
        UCHRONIA_MOCK: '1',
        UCHRONIA_DB: ':memory:',
        UCHRONIA_PORT: String(PORT),
        UCHRONIA_MOCK_PACE_MS: '0',
        UCHRONIA_SEED_DEMO: '',
      },
      stdio: ['ignore', 'ignore', 'inherit'],
    },
  )

  try {
    await waitForServer()
    for (const showcase of SHOWCASES) {
      process.stdout.write(`${showcase.title} … `)
      const created = await (
        await fetch(`${BASE}/api/timelines`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(showcase.body),
        })
      ).json()
      const branchId = created.rootBranch.id
      await (await fetch(`${BASE}/api/branches/${branchId}/generate`, { method: 'POST' })).text()

      // A showcase should show the depth, not just the spine: expand the
      // opening eras and set one artifact per era so the shelf is not empty.
      const view = await (await fetch(`${BASE}/api/branches/${branchId}/view`)).json()
      for (const era of view.eras.slice(0, 3)) {
        await fetch(`${BASE}/api/branches/${branchId}/eras/${era.id}/expand`, { method: 'POST' })
      }
      const kinds = ['newspaper', 'letter', 'telegram', 'classified']
      for (const [i, event] of view.events.slice(0, 4).entries()) {
        await fetch(`${BASE}/api/branches/${branchId}/events/${event.id}/artifacts`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ kind: kinds[i % kinds.length] }),
        })
      }
      // One event read through the schools, so the argument is visible.
      const anchor = view.events[Math.floor(view.events.length / 2)]
      if (anchor) {
        await fetch(`${BASE}/api/branches/${branchId}/events/${anchor.id}/interpretations`, {
          method: 'POST',
        })
      }

      const aggregate = await (
        await fetch(`${BASE}/api/timelines/${created.timeline.id}/export.json`)
      ).json()
      writeFileSync(
        join(root, 'demo', showcase.file),
        `${JSON.stringify(aggregate, null, 2)}\n`,
        'utf8',
      )
      console.log(
        `${aggregate.events.length} events, ${aggregate.eras.length} eras, ${aggregate.artifacts.length} artifacts -> demo/${showcase.file}`,
      )
    }
  } finally {
    server.kill()
  }
}

await main()
