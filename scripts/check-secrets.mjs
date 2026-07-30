#!/usr/bin/env node
/**
 * Secret scan (§2.1 of the v2 program, mirrored in CLAUDE.md §7): refuse to
 * let key material reach a public repository. Scans every tracked and
 * untracked-but-not-ignored file plus the staged diff for:
 *
 *   1. Anthropic key material (the real key prefix followed by key-like body)
 *   2. ANTHROPIC_API_KEY assigned a real-looking value (a committed .env copy)
 *
 * Doc placeholders ("sk-ant-..." with literal dots) do not match. Matches are
 * reported by file and line, with the match itself REDACTED - the scanner must
 * never echo what it found. Exits 1 on any hit. CI runs this on every push;
 * run it locally before pushing: pnpm check:secrets
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'

// Patterns are assembled from fragments so this file never contains the
// literal key prefix and cannot flag itself.
const KEY_PREFIX = ['sk-', 'ant-'].join('')
const KEY_BODY = '[A-Za-z0-9_-]{16,}'
const PATTERNS = [
  { name: 'anthropic key material', re: new RegExp(KEY_PREFIX + KEY_BODY) },
  {
    name: 'ANTHROPIC_API_KEY with a value',
    re: new RegExp(`ANTHROPIC_API_KEY\\s*=\\s*['"]?${KEY_PREFIX}`),
  },
]

const SELF = 'scripts/check-secrets.mjs'
const MAX_FILE_BYTES = 2_000_000 // binaries and lockfiles are not where keys hide

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

let failures = 0

function scanText(label, text) {
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    for (const { name, re } of PATTERNS) {
      if (re.test(lines[i])) {
        console.error(`SECRET SCAN: ${name} at ${label}:${i + 1} (content redacted)`)
        failures++
      }
    }
  }
}

// 1. Working tree: tracked + untracked-not-ignored files.
const files = new Set(
  (git('ls-files') + git('ls-files', '--others', '--exclude-standard'))
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f.length > 0 && f !== SELF),
)
for (const file of files) {
  let size
  try {
    size = statSync(file).size
  } catch {
    continue // deleted but still listed
  }
  if (size > MAX_FILE_BYTES) continue
  const buf = readFileSync(file)
  if (buf.includes(0)) continue // binary
  scanText(file, buf.toString('utf8'))
}

// 2. Staged diff (added lines only), in case an ignored file was force-added.
const staged = git('diff', '--cached', '--unified=0', '--no-color')
const stagedAdded = staged
  .split('\n')
  .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
  .join('\n')
scanText('staged diff', stagedAdded)

// 3. The .env file itself must be ignored (a repo where it is not is one
//    `git add .` away from leaking).
try {
  execFileSync('git', ['check-ignore', '-q', '.env'])
} catch {
  console.error('SECRET SCAN: .env is NOT gitignored - fix .gitignore before anything else')
  failures++
}

if (failures > 0) {
  console.error(`\nsecret scan failed with ${failures} finding(s); nothing was echoed`)
  process.exit(1)
}
console.log(`secret scan clean (${files.size} files + staged diff + .env ignore check)`)
