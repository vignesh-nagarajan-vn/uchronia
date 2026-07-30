#!/usr/bin/env node
/**
 * Baseline assembler (v2/M16): merge authored anchor batches into
 * packages/core/data/baseline.json (dataset version 2), enforcing the
 * structural contract before anything lands:
 *
 *   node scripts/build-baseline.mjs <batch1.json> [batch2.json ...]
 *
 * Checks: required fields and types, region taxonomy, lens vocabulary,
 * magnitude 1-5, attractorStrength 0-1, unique ids, no em dashes anywhere,
 * summary length, and it prints the century/region histograms the coverage
 * quotas are judged against. Exits nonzero on any violation; the final
 * authority remains BaselineDataset.parse in packages/schemas at test time.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const REGIONS = new Set([
  'Mediterranean',
  'Europe',
  'Middle East',
  'Africa',
  'East Asia',
  'South Asia',
  'Southeast Asia',
  'North America',
  'South America',
  'Oceania',
  'the wider world',
])
const LENSES = new Set(['political', 'technological', 'cultural', 'economic', 'daily-life'])

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('usage: node scripts/build-baseline.mjs <batch.json> [...]')
  process.exit(2)
}

const errors = []
const anchors = []
const seenIds = new Map()
const seenTitleYear = new Map()

for (const file of files) {
  let batch
  try {
    batch = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    errors.push(`${file}: unreadable or invalid JSON (${error.message})`)
    continue
  }
  if (!Array.isArray(batch)) {
    errors.push(`${file}: not a JSON array`)
    continue
  }
  batch.forEach((a, i) => {
    const where = `${file}[${i}] ${a?.id ?? '(no id)'}`
    const fail = (msg) => errors.push(`${where}: ${msg}`)
    if (typeof a !== 'object' || a === null) {
      fail('not an object')
      return
    }
    if (typeof a.id !== 'string' || !/^bl-[a-z0-9-]+$/.test(a.id)) fail('bad id (bl-kebab-case)')
    if (!Number.isInteger(a.year) || a.year === 0 || a.year < -4000 || a.year > 2100)
      fail(`bad year ${a.year}`)
    if (typeof a.title !== 'string' || a.title.length < 1 || a.title.length > 90) fail('bad title')
    if (typeof a.summary !== 'string' || a.summary.length < 20 || a.summary.length > 260)
      fail(`summary length ${a.summary?.length}`)
    if (!REGIONS.has(a.region)) fail(`bad region "${a.region}"`)
    if (
      !Array.isArray(a.regions) ||
      a.regions.length < 1 ||
      a.regions.length > 3 ||
      !a.regions.every((r) => REGIONS.has(r)) ||
      a.regions[0] !== a.region
    )
      fail('bad regions (must start with the primary region)')
    if (
      !Array.isArray(a.lenses) ||
      a.lenses.length < 1 ||
      a.lenses.length > 3 ||
      !a.lenses.every((l) => LENSES.has(l))
    )
      fail('bad lenses')
    if (
      !Array.isArray(a.tags) ||
      a.tags.length < 1 ||
      a.tags.length > 6 ||
      !a.tags.every((t) => typeof t === 'string' && /^[a-z][a-z0-9-]*$/.test(t))
    )
      fail('bad tags')
    if (!Number.isInteger(a.magnitude) || a.magnitude < 1 || a.magnitude > 5)
      fail(`bad magnitude ${a.magnitude}`)
    if (
      typeof a.attractorStrength !== 'number' ||
      a.attractorStrength < 0 ||
      a.attractorStrength > 1
    )
      fail(`bad attractorStrength ${a.attractorStrength}`)
    for (const [key, value] of Object.entries(a)) {
      if (typeof value === 'string' && /[—―]/.test(value)) fail(`em dash in ${key}`)
    }
    if (seenIds.has(a.id)) fail(`duplicate id (also in ${seenIds.get(a.id)})`)
    else seenIds.set(a.id, file)
    const titleKey = `${a.title.toLowerCase()}@${a.year}`
    if (seenTitleYear.has(titleKey))
      fail(`duplicate title+year (also in ${seenTitleYear.get(titleKey)})`)
    else seenTitleYear.set(titleKey, file)
    anchors.push(a)
  })
}

if (errors.length > 0) {
  for (const e of errors.slice(0, 60)) console.error(`ERROR ${e}`)
  if (errors.length > 60) console.error(`... and ${errors.length - 60} more`)
  console.error(`\n${errors.length} violations; nothing written`)
  process.exit(1)
}

anchors.sort((a, b) => a.year - b.year || a.id.localeCompare(b.id))

// Histograms for the quota review.
const byCentury = new Map()
const byRegion = new Map()
for (const a of anchors) {
  const label =
    a.year < 0
      ? `${Math.abs(Math.ceil(a.year / 100) * 100)} BC`
      : `${Math.ceil(a.year / 100) * 100}`
  byCentury.set(label, (byCentury.get(label) ?? 0) + 1)
  byRegion.set(a.region, (byRegion.get(a.region) ?? 0) + 1)
}
const twentieth = anchors.filter((a) => a.year >= 1901 && a.year <= 2000).length

const dataset = {
  version: 2,
  provenance: 'curated',
  note: `The real-history spine, v2 (M16): ${anchors.length} curated anchor events, antiquity to the present, with themes, multi-region reach, magnitude, and attractor strength. Hand-authored context for the record rail, retrieval, and convergence detection; never generated content. Assembled by scripts/build-baseline.mjs.`,
  anchors,
}
const target = resolve('packages/core/data/baseline.json')
writeFileSync(
  target,
  `${JSON.stringify({ ...dataset, anchors: [] }, null, 2).replace('"anchors": []', `"anchors": [\n${anchors.map((a) => `    ${JSON.stringify(a)}`).join(',\n')}\n  ]`)}\n`,
  'utf8',
)

console.log(`wrote ${anchors.length} anchors to ${target}`)
console.log(`20th century (1901-2000): ${twentieth}`)
console.log('\nby region:')
for (const [region, count] of [...byRegion.entries()].sort((a, b) => b[1] - a[1]))
  console.log(`  ${region}: ${count}`)
console.log('\nby century (sparse listing, count < 2 flagged):')
const sortedCenturies = [...byCentury.entries()]
for (const [label, count] of sortedCenturies) {
  if (count < 2) console.log(`  THIN ${label}: ${count}`)
}
console.log(`  (centuries represented: ${sortedCenturies.length})`)
