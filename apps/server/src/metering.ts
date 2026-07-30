import { AsyncLocalStorage } from 'node:async_hooks'
import type { Clock, LLMProvider } from '@uchronia/core'
import type { DailyBudget, VisitorLedger } from './gate.js'

/**
 * Metering (v2.1/M26).
 *
 * M24 charged the day's ledger from inside the generation route, which was the
 * only route anyone was expected to reach on a passphrase-gated instance. Once
 * anonymous visitors can spend (ADR-0006) that is no longer enough: expanding
 * an era, asking the archivist, running a pulse and forking all reach the
 * provider too, and none of them touched the ledger. A visitor who never
 * pressed "derive" spent nothing on paper and real money in fact.
 *
 * So the charge moves to the one place every route funnels through: the
 * provider itself. Wrapping `complete` means a new spending route is metered
 * the day it is written, with nothing to remember.
 *
 * Attribution rides an AsyncLocalStorage scope opened by the gate. The store
 * survives into the SSE stream because Hono starts the stream callback
 * synchronously inside the handler, so the async resource captures the context
 * before `run` returns.
 */

export interface Caller {
  /** Rate-limit and ledger identity: the forwarded client IP, or 'local'. */
  key: string
  /**
   * False for an unlocked session. The owner past the passphrase is not a
   * visitor and is not charged against the per-visitor allowance, though the
   * instance budget still bounds them: that one is the money, not the queue.
   */
  metered: boolean
}

export const callerContext = new AsyncLocalStorage<Caller>()

/** Run `fn` with the caller attributed for every provider call it causes. */
export function withCaller<T>(caller: Caller, fn: () => T): T {
  return callerContext.run(caller, fn)
}

/**
 * Wrap a provider so that every call charges the instance ledger, and the
 * per-visitor ledger when the caller is a visitor. Usage is absent on the mock
 * (it meters nothing), so demo instances pass through untouched.
 */
export function meterProvider(
  provider: LLMProvider,
  budget: DailyBudget,
  visitors: VisitorLedger,
  clock: Clock,
): LLMProvider {
  return {
    mode: provider.mode,
    async complete(request) {
      // Charge on the way out, including when the call throws after the
      // provider already billed for it: a truncated response still cost.
      const result = await provider.complete(request)
      const usage = result.usage
      if (usage) {
        // Cache reads and writes are reported separately and are already
        // folded into the input count upstream; matching the cost meter's
        // arithmetic keeps the two numbers telling the same story.
        const tokens = usage.inputTokens + usage.outputTokens
        const now = clock.now()
        budget.record(tokens, now)
        const caller = callerContext.getStore()
        if (caller?.metered) visitors.record(caller.key, tokens, now)
      }
      return result
    },
  }
}
