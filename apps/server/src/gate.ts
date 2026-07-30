import { timingSafeEqual } from 'node:crypto'
import type { Context, MiddlewareHandler, Next } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import type { ServerConfig } from './config.js'
import { ApiError } from './http-error.js'
import { withCaller } from './metering.js'

/**
 * The spending gate (v2/M24, ADR-0005). A public instance holding a real key
 * is a public endpoint that bills its owner, so three things stand between a
 * visitor and the provider: a passphrase, a per-IP rate limit, and a daily
 * token budget. All three are off locally, where the key is the owner's own
 * and the surface is loopback.
 *
 * Everything here fails toward the demo. A gate that errors open is not a
 * gate; a gate that errors closed costs a stranger a page of canned history,
 * which is what they were getting anyway.
 */

export const UNLOCK_COOKIE = 'uchronia_unlocked'

/** Constant-time compare that does not leak length through early return. */
export function passphraseMatches(expected: string, given: string): boolean {
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(given, 'utf8')
  // timingSafeEqual throws on length mismatch, so pad to a common length and
  // fold the length check into the result rather than short-circuiting on it.
  const length = Math.max(a.length, b.length, 1)
  const padded = (buf: Buffer) => {
    const out = Buffer.alloc(length)
    buf.copy(out)
    return out
  }
  return timingSafeEqual(padded(a), padded(b)) && a.length === b.length
}

export function isUnlocked(c: Context, config: ServerConfig): boolean {
  if (config.accessToken === undefined) return true
  const cookie = getCookie(c, UNLOCK_COOKIE)
  return cookie !== undefined && passphraseMatches(config.accessToken, cookie)
}

/**
 * Whether this caller spends as the instance's owner rather than as one of its
 * visitors (v2.1/M26).
 *
 * `isUnlocked` answers a different question and cannot be reused here: it
 * reports true whenever no passphrase is configured, which is right for "is
 * anything barring this request" and wrong for "whose allowance is this". On a
 * public instance nobody has configured a passphrase and everybody is a
 * visitor, so conflating the two would meter no one.
 */
export function isOwner(c: Context, config: ServerConfig): boolean {
  // Proved the passphrase.
  if (config.accessToken !== undefined) return isUnlocked(c, config)
  // No passphrase and no public posture: this is the local instance, and the
  // only caller who can reach it is the owner.
  return !config.publicLive
}

export function grantUnlock(c: Context, config: ServerConfig): void {
  if (config.accessToken === undefined) return
  setCookie(c, UNLOCK_COOKIE, config.accessToken, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: config.serverless,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

/** Fixed-window per-IP counter. In-memory by design: see ADR-0005. */
class RateLimiter {
  private readonly hits = new Map<string, { windowStart: number; count: number }>()

  constructor(private readonly perMinute: number) {}

  allow(key: string, now: number): boolean {
    if (this.perMinute <= 0) return true
    const window = Math.floor(now / 60_000)
    const entry = this.hits.get(key)
    if (!entry || entry.windowStart !== window) {
      // Sweep on write rather than on a timer: the map only ever holds the
      // callers seen in the current minute, and nothing needs unrefing.
      if (this.hits.size > 4096) this.hits.clear()
      this.hits.set(key, { windowStart: window, count: 1 })
      return true
    }
    entry.count += 1
    return entry.count <= this.perMinute
  }
}

/** A UTC-day token ledger. Resets on the date changing, not on a timer. */
export class DailyBudget {
  private day = ''
  private spent = 0

  constructor(private readonly limit: number) {}

  private roll(now: Date): void {
    const today = now.toISOString().slice(0, 10)
    if (today !== this.day) {
      this.day = today
      this.spent = 0
    }
  }

  record(tokens: number, now: Date): void {
    this.roll(now)
    this.spent += tokens
  }

  exhausted(now: Date): boolean {
    if (this.limit <= 0) return false
    this.roll(now)
    return this.spent >= this.limit
  }

  /** Null when uncapped: "no cap" is a state, not a very large number. */
  status(now: Date): { limit: number; spent: number; remaining: number } | null {
    this.roll(now)
    if (this.limit <= 0) return null
    return {
      limit: this.limit,
      spent: this.spent,
      remaining: Math.max(0, this.limit - this.spent),
    }
  }
}

/**
 * A per-caller UTC-day token ledger (v2.1/M26). The instance budget bounds the
 * invoice; this bounds any one visitor's share of it, so the first person
 * through the door on a public instance cannot spend the whole day.
 *
 * Like the rate limiter, it is in-memory and per instance, and it sheds its
 * whole map rather than evicting cleverly when it grows past the cap. Both
 * choices fail toward generosity, which is the acceptable direction here: the
 * layer that actually bounds the loss is the instance budget behind it, and
 * behind that the provider-side spend limit on the account (ADR-0005).
 */
export class VisitorLedger {
  private day = ''
  private readonly spent = new Map<string, number>()

  constructor(private readonly limit: number) {}

  private roll(now: Date): void {
    const today = now.toISOString().slice(0, 10)
    if (today !== this.day) {
      this.day = today
      this.spent.clear()
    }
  }

  record(key: string, tokens: number, now: Date): void {
    if (this.limit <= 0) return
    this.roll(now)
    if (this.spent.size > 8192 && !this.spent.has(key)) this.spent.clear()
    this.spent.set(key, (this.spent.get(key) ?? 0) + tokens)
  }

  exhausted(key: string, now: Date): boolean {
    if (this.limit <= 0) return false
    this.roll(now)
    return (this.spent.get(key) ?? 0) >= this.limit
  }

  /** Null when uncapped, matching DailyBudget: "no cap" is a state. */
  status(key: string, now: Date): { limit: number; spent: number; remaining: number } | null {
    if (this.limit <= 0) return null
    this.roll(now)
    const spent = this.spent.get(key) ?? 0
    return { limit: this.limit, spent, remaining: Math.max(0, this.limit - spent) }
  }
}

export function callerKey(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || c.req.header('x-real-ip') || 'local'
}

/**
 * Guard the routes that can reach the provider. Order matters: identity
 * first (a locked instance should not consume anyone's rate budget), then
 * rate, then the visitor's allowance, then the day's money.
 *
 * Two postures reach this code. On a passphrase instance an anonymous caller
 * is refused outright. On a public instance (ADR-0006) they are admitted and
 * metered, and the passphrase becomes an override rather than a door: an
 * unlocked session skips the per-visitor allowance, because the owner is not
 * a visitor. Nobody skips the instance budget. That one is the invoice.
 */
export function spendingGate(
  config: ServerConfig,
  budget: DailyBudget,
  visitors: VisitorLedger,
  clock: { now: () => Date },
): MiddlewareHandler {
  const limiter = new RateLimiter(config.rateLimitPerMinute)
  return async (c: Context, next: Next) => {
    // Demo mode spends nothing, so nothing here applies to it.
    if (config.mock) return next()

    const owner = isOwner(c, config)
    if (!owner && !config.publicLive) {
      throw new ApiError(
        401,
        'locked',
        'this instance derives on someone else’s account; unlock it with the passphrase to spend, or read the demo chronicles instead',
      )
    }

    const caller = callerKey(c)
    if (!limiter.allow(caller, clock.now().getTime())) {
      throw new ApiError(429, 'rate-limited', 'too many derivations in one minute; wait and retry')
    }
    if (!owner && visitors.exhausted(caller, clock.now())) {
      throw new ApiError(
        429,
        'visitor-budget-exhausted',
        'you have used your share of this instance’s derivation budget for the day; it resets at midnight UTC, or run your own key locally',
      )
    }
    if (budget.exhausted(clock.now())) {
      throw new ApiError(
        429,
        'budget-exhausted',
        'this instance has spent its budget for the day; it resets at midnight UTC',
      )
    }
    // Everything downstream, including the SSE stream, runs attributed so the
    // provider wrapper can charge the right ledger (see metering.ts).
    return withCaller({ key: caller, metered: !owner }, () => next())
  }
}
