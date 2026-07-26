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
  /**
   * Interface the listener binds. Defaults to loopback (SECURITY.md's
   * localhost-only posture); containers set UCHRONIA_HOST=0.0.0.0.
   */
  host: string
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
   * streaming the next, so the ink-in is visible. Defaults to 0 (and is
   * always 0 in live mode); under Vercel's mock playground it defaults to
   * 250 so derivations visibly ink in. Tests and CI leave it unset.
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
  // Generation must support structured outputs (the provider sends
  // output_config.format on every call); claude-sonnet-5 does, its
  // predecessor claude-sonnet-4-6 does not.
  generation: 'claude-sonnet-5',
  critic: 'claude-haiku-4-5-20251001',
} as const

const truthy = (value: string | undefined): boolean => value === '1' || value === 'true'

/**
 * An env var that is set-but-empty (the shape a copied template or a blank
 * dashboard field produces) means "unset": every default below survives it.
 */
const text = (value: string | undefined): string | undefined => value?.trim() || undefined

const number = (value: string | undefined): number | undefined => {
  const raw = text(value)
  if (raw === undefined) return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const apiKey = text(env.ANTHROPIC_API_KEY)
  const mockRequested = truthy(env.UCHRONIA_MOCK)
  // Mock mode is load-bearing: no key means we degrade to mock rather than crash.
  const mock = mockRequested || apiKey === undefined
  const maxRunTokens = number(env.UCHRONIA_MAX_RUN_TOKENS)
  const mockPaceMs = number(env.UCHRONIA_MOCK_PACE_MS)
  // Serverless (Vercel) has no durable disk: the database lives in /tmp per
  // warm instance, the showcase chronicle seeds it so visitors land on
  // content, and pacing defaults on so derivations visibly ink in. All three
  // stay overridable through the usual variables. The /tmp redirect also
  // applies on any other Lambda-shaped runtime, where the task root is
  // read-only even when the platform hides the VERCEL variable.
  const onVercel = truthy(env.VERCEL)
  const serverless =
    onVercel || env.AWS_LAMBDA_FUNCTION_NAME !== undefined || env.LAMBDA_TASK_ROOT !== undefined
  return {
    port: number(env.UCHRONIA_PORT) ?? 8787,
    host: text(env.UCHRONIA_HOST) ?? '127.0.0.1',
    mock,
    apiKey: mock ? undefined : apiKey,
    models: {
      generation: text(env.UCHRONIA_MODEL_GENERATION) ?? DEFAULT_MODELS.generation,
      critic: text(env.UCHRONIA_MODEL_CRITIC) ?? DEFAULT_MODELS.critic,
    },
    dbPath:
      text(env.UCHRONIA_DB) === ':memory:'
        ? ':memory:'
        : resolve(
            text(env.UCHRONIA_DB) ?? (serverless ? '/tmp/uchronia.db' : './data/uchronia.db'),
          ),
    maxRunTokens: maxRunTokens !== undefined ? Math.max(0, maxRunTokens) : 3_000_000,
    mockPaceMs:
      mock && mockPaceMs !== undefined ? Math.max(0, mockPaceMs) : mock && onVercel ? 250 : 0,
    staticDir: text(env.UCHRONIA_STATIC_DIR),
    corsOrigins: (env.UCHRONIA_CORS_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0),
    seedDemo:
      text(env.UCHRONIA_SEED_DEMO) !== undefined ? truthy(env.UCHRONIA_SEED_DEMO) : onVercel,
  }
}
