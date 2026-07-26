/**
 * Records the README's hero capture: a derivation streaming into the ledger
 * (Nitrate theme), then a red-thread hover. Reproducible: run `pnpm dev:mock`
 * in one terminal, then from apps/web:
 *
 *   node scripts/capture-readme-gif.mjs
 *
 * Writes docs/media/derivation.gif. Each run creates (and then burns) a
 * throwaway timeline via the catalogue.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import gifenc from 'gifenc'
import pngjs from 'pngjs'

const { applyPalette, GIFEncoder, quantize } = gifenc
const { PNG } = pngjs

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, '..', '..', '..', 'docs', 'media', 'derivation.gif')
const BASE = process.env.CAPTURE_BASE_URL ?? 'http://localhost:5173'
const WIDTH = 880
const HEIGHT = 560
const FRAME_MS = 160
const CATALOGUE_ENTRY = /The press is suppressed/

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  })
  await page.addInitScript(() => localStorage.setItem('uchronia-theme', 'nitrate'))
  await page.goto(BASE)
  await page.getByText('or choose from the catalogue').waitFor({ timeout: 20_000 })
  await page.getByRole('button', { name: CATALOGUE_ENTRY }).click()
  await page.waitForURL(/\/t\/.+\/b\/.+/, { timeout: 30_000 })

  const frames = []
  const shoot = async () => frames.push(await page.screenshot({ type: 'png' }))
  const followInk = () =>
    page
      .getByTestId('timeline-scroll')
      .evaluate((el) => {
        el.scrollTop = el.scrollHeight
      })
      .catch(() => {})

  // The stream: the camera follows the ink to the bottom as events land.
  const done = () =>
    page
      .getByRole('button', { name: 'Continue derivation' })
      .isVisible()
      .catch(() => false)
  const deadline = Date.now() + 45_000
  while (Date.now() < deadline) {
    await shoot()
    if (await done()) break
    await followInk()
    await page.waitForTimeout(FRAME_MS)
  }
  // Let the finished ledger breathe for a beat.
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(FRAME_MS)
    await shoot()
  }

  // Back to the divergence, then hover inside the seed cluster - its causal
  // relatives sit close, so the red threads land on screen.
  await page.getByTestId('timeline-scroll').evaluate((el) => {
    el.scrollTop = 0
  })
  await page.waitForTimeout(300)
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(FRAME_MS)
    await shoot()
  }
  const cards = page.locator('[data-event-id]')
  if ((await cards.count()) > 1) {
    await cards.nth(1).hover()
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(FRAME_MS)
      await shoot()
    }
  }

  // Clean up the throwaway timeline before encoding.
  const timelineId = page.url().match(/\/t\/([0-9A-Z]+)/)?.[1]
  if (timelineId) {
    await page.request.delete(`${BASE.replace('5173', '8787')}/api/timelines/${timelineId}`)
  }
  await browser.close()

  console.log(`captured ${frames.length} frames, encoding…`)
  const decoded = frames.map((buffer) => PNG.sync.read(buffer))
  const first = decoded[0]
  // One shared palette from a late frame (the fullest ledger) keeps the file
  // small and the ink stable across frames.
  const paletteSource = decoded[Math.floor(decoded.length * 0.7)] ?? first
  const palette = quantize(new Uint8Array(paletteSource.data), 256)

  const gif = GIFEncoder()
  for (const frame of decoded) {
    const indexed = applyPalette(new Uint8Array(frame.data), palette)
    gif.writeFrame(indexed, frame.width, frame.height, { palette, delay: FRAME_MS })
  }
  gif.finish()

  mkdirSync(dirname(OUT), { recursive: true })
  const bytes = gif.bytes()
  writeFileSync(OUT, bytes)
  console.log(
    `wrote ${OUT} (${(bytes.length / 1024 / 1024).toFixed(2)} MB, ${decoded.length} frames)`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
