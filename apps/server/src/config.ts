import { resolve } from 'node:path'

/**
 * Server configuration, read once from the environment.
 *
 * ANTHROPIC_API_KEY lives here and only here (§6). The value is never logged,
 * never serialized into a response, and never reaches the client — routes may
 * expose `keyConfigured` (a boolean) at most.
 */
export interface ServerConfig {
  port: number
  /** True when the whole app runs on the deterministic MockProvider. */
  mock: boolean
  /** Present only in live mode. Treat as a secret. */
  apiKey: string | undefined
  models: {
    generation: string
    critic: string
  }
  /** Absolute path — a CWD-relative default must not silently open a second DB. */
  dbPath: string
  /**
   * Hard ceiling on total tokens (input + output) one generation run may
   * spend before it is aborted cleanly. 0 disables the ceiling.
   */
  maxRunTokens: number
  /**
   * Mock-mode demo pacing: milliseconds to hold each accepted event before
   * streaming the next, so the ink-in is visible. 0 (the default, and always
   * in live mode) streams at full speed; tests and CI leave it unset.
   */
  mockPaceMs: number
  /** Serve the built web app from this directory when set (production). */
  staticDir: string | undefined
  /** Comma-separated CORS origin allowlist; empty = same-origin only. */
  corsOrigins: string[]
  /** Import the showcase chronicle into an empty database at boot. */
  seedDemo: boolean
}

export const DEFAULT_MODELS = {
  generation: 'claude-sonnet-4-6',
  critic: 'claude-haiku-4-5-20251001',
} as const

const truthy = (value: string | undefined): boolean => value === '1' || value === 'true'

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const apiKey = env.ANTHROPIC_API_KEY?.trim() || undefined
  const mockRequested = truthy(env.UCHRONIA_MOCK)
  // Mock mode is load-bearing: no key means we degrade to mock rather than crash.
  const mock = mockRequested || apiKey === undefined
  const maxRunTokens = Number(env.UCHRONIA_MAX_RUN_TOKENS)
  const mockPaceMs = Number(env.UCHRONIA_MOCK_PACE_MS)
  // Serverless (Vercel) has no durable disk: the database lives in /tmp per
  // warm instance, the showcase chronicle seeds it so visitors land on
  // content, and pacing defaults on so derivations visibly ink in. All three
  // stay overridable through the usual variables.
  const onVercel = truthy(env.VERCEL)
  return {
    port: Number(env.UCHRONIA_PORT) || 8787,
    mock,
    apiKey: mock ? undefined : apiKey,
    models: {
      generation: env.UCHRONIA_MODEL_GENERATION?.trim() || DEFAULT_MODELS.generation,
      critic: env.UCHRONIA_MODEL_CRITIC?.trim() || DEFAULT_MODELS.critic,
    },
    dbPath:
      env.UCHRONIA_DB?.trim() === ':memory:'
        ? ':memory:'
        : resolve(
            env.UCHRONIA_DB?.trim() || (onVercel ? '/tmp/uchronia.db' : './data/uchronia.db'),
          ),
    maxRunTokens: Number.isFinite(maxRunTokens) ? Math.max(0, maxRunTokens) : 3_000_000,
    mockPaceMs:
      mock && Number.isFinite(mockPaceMs) ? Math.max(0, mockPaceMs) : mock && onVercel ? 250 : 0,
    staticDir: env.UCHRONIA_STATIC_DIR?.trim() || undefined,
    corsOrigins: (env.UCHRONIA_CORS_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0),
    seedDemo: env.UCHRONIA_SEED_DEMO !== undefined ? truthy(env.UCHRONIA_SEED_DEMO) : onVercel,
  }
}
