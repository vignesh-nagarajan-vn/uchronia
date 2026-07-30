import type { TokenUsage } from './llm.js'

/**
 * Pricing ESTIMATES for the cost meter, in USD per million tokens.
 *
 * Verified 2026-07-29 against the Anthropic model catalog. These are display
 * estimates only: billing truth lives with Anthropic, prices change, and
 * introductory rates exist (claude-sonnet-5 bills 2.00/10.00 through
 * 2026-08-31; the standard list price is used here so the meter never
 * under-promises). Cache reads bill at 0.1x the input rate; 5-minute-TTL
 * cache writes at 1.25x.
 */
export const PRICING_VERIFIED_ON = '2026-07-29'

export interface ModelPricing {
  inputPerMTok: number
  outputPerMTok: number
  cacheReadPerMTok: number
  cacheWritePerMTok: number
}

const TABLE: Record<string, ModelPricing> = {
  'claude-sonnet-5': {
    inputPerMTok: 3,
    outputPerMTok: 15,
    cacheReadPerMTok: 0.3,
    cacheWritePerMTok: 3.75,
  },
  'claude-sonnet-4-6': {
    inputPerMTok: 3,
    outputPerMTok: 15,
    cacheReadPerMTok: 0.3,
    cacheWritePerMTok: 3.75,
  },
  'claude-haiku-4-5': {
    inputPerMTok: 1,
    outputPerMTok: 5,
    cacheReadPerMTok: 0.1,
    cacheWritePerMTok: 1.25,
  },
  'claude-opus-5': {
    inputPerMTok: 5,
    outputPerMTok: 25,
    cacheReadPerMTok: 0.5,
    cacheWritePerMTok: 6.25,
  },
  'claude-opus-4-8': {
    inputPerMTok: 5,
    outputPerMTok: 25,
    cacheReadPerMTok: 0.5,
    cacheWritePerMTok: 6.25,
  },
}

/**
 * Resolve a model id to its pricing row. Dated ids (claude-haiku-4-5-20251001)
 * resolve to their family via longest-prefix match on a `-` boundary, so
 * claude-sonnet-5 never swallows a hypothetical claude-sonnet-52.
 */
export function pricingFor(model: string): ModelPricing | undefined {
  let best: ModelPricing | undefined
  let bestLen = -1
  for (const [family, pricing] of Object.entries(TABLE)) {
    if ((model === family || model.startsWith(`${family}-`)) && family.length > bestLen) {
      best = pricing
      bestLen = family.length
    }
  }
  return best
}

export type UsageByModel = Record<string, TokenUsage>

export interface CostEstimate {
  /** Estimated USD across every model the table knows. */
  usd: number
  /** Models the table could not price (their tokens are NOT in `usd`). */
  unpriced: string[]
}

export function estimateUsd(byModel: UsageByModel): CostEstimate {
  let usd = 0
  const unpriced: string[] = []
  for (const [model, usage] of Object.entries(byModel)) {
    const pricing = pricingFor(model)
    if (!pricing) {
      unpriced.push(model)
      continue
    }
    usd +=
      (usage.inputTokens * pricing.inputPerMTok +
        usage.outputTokens * pricing.outputPerMTok +
        (usage.cacheReadTokens ?? 0) * pricing.cacheReadPerMTok +
        (usage.cacheWriteTokens ?? 0) * pricing.cacheWritePerMTok) /
      1_000_000
  }
  return { usd, unpriced }
}
