import { resolve } from 'node:path'

/**
 * Server configuration, read once from the environment.
 *
 * ANTHROPIC_API_KEY lives here and only here (§6). The value is never logged,
 * never serialized into a response, and never reaches the client - routes may
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
  /** Absolute path - a CWD-relative default must not silently open a second DB. */
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
  /**
   * Engine Room retention (v2/M15): how many generation runs' traces to keep
   * per branch. 0 disables tracing entirely. Serverless defaults low - /tmp
   * is small and cold starts reset it anyway.
   */
  traceRuns: number
  /** Serve the built web app from this directory when set (production). */
  staticDir: string | undefined
  /** Comma-separated CORS origin allowlist; empty = same-origin only. */
  corsOrigins: string[]
  /** Import the showcase chronicle into an empty database at boot. */
  seedDemo: boolean
  /**
   * The passphrase that unlocks spending on a public deployment (v2/M24).
   * When set alongside a key, every route that can cost money requires an
   * unlocked session; anonymous visitors get full demo mode. Treat as a
   * secret: it is compared in constant time and never echoed.
   */
  accessToken: string | undefined
  /**
   * True when anonymous visitors may spend (v2.1/M26, ADR-0006). This is the
   * deliberate opt-in that turns a deployment into a public live instance:
   * without it, a serverless key still needs the passphrase. It is never
   * implied, because the thing it buys is strangers deriving on the owner's
   * account, and that has to be a decision someone typed.
   */
  publicLive: boolean
  /**
   * True when this instance may actually spend. On serverless, a key with
   * neither an access token nor an explicit public-live opt-in is REFUSED
   * rather than trusted: the fail-safe direction is "serve the demo", because
   * the alternative is a public endpoint that quietly bills the owner.
   * Locally, a key is the owner's own decision and is honoured.
   */
  liveAllowed: boolean
  /** Total tokens this instance may spend per UTC day. 0 disables the cap. */
  dailyTokenBudget: number
  /**
   * Tokens one anonymous caller may spend per UTC day (v2.1/M26). The day's
   * instance budget bounds the invoice; this bounds any one visitor's share of
   * it, so the first person through the door cannot take the whole day. An
   * unlocked session is not a visitor and is not charged against it.
   */
  visitorTokenBudget: number
  /** Requests per minute per IP on routes that can spend. 0 disables. */
  rateLimitPerMinute: number
  /** True on Vercel/Lambda: no durable disk, public by default. */
  serverless: boolean
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
  // The deployment posture (v2/M24 + v2.1/M26, ADR-0005 as amended by
  // ADR-0006). A key on a public serverless instance could quietly bill the
  // owner for strangers' derivations, so it is refused unless someone has said
  // in the environment how that is meant to work: either UCHRONIA_ACCESS_TOKEN
  // (spending is the owner's, behind a passphrase) or UCHRONIA_PUBLIC_LIVE
  // (spending is the public's, behind the meters below). Absent both, the
  // instance keeps its key unused and serves demo mode. Locally there is no
  // such exposure and no such rule.
  const accessToken = text(env.UCHRONIA_ACCESS_TOKEN)
  const publicLiveRequested = truthy(env.UCHRONIA_PUBLIC_LIVE)
  const liveAllowed = !mock && (!serverless || accessToken !== undefined || publicLiveRequested)
  const effectiveMock = mock || !liveAllowed
  // A flag that survived into a demo instance would be a lie on /api/config.
  const publicLive = publicLiveRequested && !effectiveMock
  // Defaults exist so that turning the posture on cannot leave it unmetered:
  // a public instance always has a per-visitor allowance unless one is
  // explicitly zeroed, and a single run may never exceed one visitor's day.
  const visitorTokenBudget = number(env.UCHRONIA_VISITOR_TOKEN_BUDGET) ?? (publicLive ? 150_000 : 0)
  // What makes an instance need brakes is strangers reaching it, which is
  // usually serverless but is exactly what the public posture declares. A
  // public container behind UCHRONIA_HOST=0.0.0.0 is as exposed as Vercel is.
  const exposed = serverless || publicLive

  return {
    port: number(env.UCHRONIA_PORT) ?? 8787,
    host: text(env.UCHRONIA_HOST) ?? '127.0.0.1',
    mock: effectiveMock,
    apiKey: effectiveMock ? undefined : apiKey,
    accessToken,
    publicLive,
    liveAllowed,
    dailyTokenBudget: number(env.UCHRONIA_DAILY_TOKEN_BUDGET) ?? (exposed ? 2_000_000 : 0),
    visitorTokenBudget: Math.max(0, visitorTokenBudget),
    rateLimitPerMinute: number(env.UCHRONIA_RATE_LIMIT) ?? (exposed ? 20 : 0),
    serverless,
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
    // One run may not outlast one visitor's allowance: the gate checks the
    // ledger between requests, so without this a single unbounded chronicle
    // could overshoot the allowance by an order of magnitude before the next
    // check ever ran.
    maxRunTokens:
      maxRunTokens !== undefined
        ? Math.max(0, maxRunTokens)
        : publicLive && visitorTokenBudget > 0
          ? visitorTokenBudget
          : 3_000_000,
    traceRuns: (() => {
      const parsed = number(env.UCHRONIA_TRACE_RUNS)
      if (parsed !== undefined) return Math.max(0, parsed)
      return serverless ? 3 : 20
    })(),
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
