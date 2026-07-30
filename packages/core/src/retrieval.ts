import type { BaselineAnchor } from '@uchronia/schemas'

/**
 * Baseline retrieval (v2/M14): rank curated anchors against a freeform query
 * so intake grounds on the real record instead of free association. Pure
 * function over injected data - the server passes the anchors in.
 */

const STOPWORDS = new Set([
  'what',
  'would',
  'could',
  'have',
  'happened',
  'happens',
  'were',
  'was',
  'the',
  'a',
  'an',
  'of',
  'in',
  'on',
  'at',
  'to',
  'and',
  'or',
  'not',
  'never',
  'had',
  'if',
  'his',
  'her',
  'their',
  'its',
  'is',
  'are',
  'been',
  'did',
  'does',
  'do',
  'instead',
  'without',
  'with',
  'that',
  'this',
  'there',
  'when',
  'who',
  'how',
  'why',
  'after',
  'before',
  'during',
])

/** Lowercased content tokens, 3+ characters, stopwords removed. */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []).filter((t) => !STOPWORDS.has(t))
}

export interface RetrievalOpts {
  /** Bias scoring toward this year when the query implies one. */
  year?: number | null
  limit?: number
}

export interface ScoredAnchor {
  anchor: BaselineAnchor
  score: number
}

/**
 * Keyword evidence only. A specific title word ("constantinople") weighs 3; a
 * short generic one ("sea") weighs 1, so a lone common word never outranks
 * real evidence. Summary hits weigh 1, region-name hits 2.
 */
export function keywordScore(anchor: BaselineAnchor, queryTokens: readonly string[]): number {
  const title = new Set(tokenize(anchor.title))
  const summary = new Set(tokenize(anchor.summary))
  const region = new Set(tokenize(anchor.region))
  let score = 0
  for (const token of queryTokens) {
    if (title.has(token)) score += token.length >= 5 ? 3 : 1
    else if (summary.has(token)) score += 1
    if (region.has(token)) score += 2
  }
  return score
}

/**
 * Full score: keyword evidence plus a year bias (when given) worth up to 3
 * within a century, fading to nothing by five centuries out.
 */
export function scoreAnchor(
  anchor: BaselineAnchor,
  queryTokens: readonly string[],
  year?: number | null,
): number {
  if (queryTokens.length === 0 && (year === undefined || year === null)) return 0
  let score = keywordScore(anchor, queryTokens)
  if (year !== undefined && year !== null) {
    const distance = Math.abs(anchor.year - year)
    if (distance <= 500) score += 3 * (1 - distance / 500) ** 2
  }
  return score
}

/**
 * Top anchors for a query, best first. Anchors that score zero are dropped
 * entirely - an empty result is the honest answer for garbage input.
 */
export function retrieveAnchors(
  anchors: readonly BaselineAnchor[],
  query: string,
  opts: RetrievalOpts = {},
): BaselineAnchor[] {
  const limit = opts.limit ?? 12
  const tokens = tokenize(query)
  return anchors
    .map((anchor) => ({ anchor, score: scoreAnchor(anchor, tokens, opts.year) }))
    .filter((s) => s.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Math.abs(a.anchor.year - (opts.year ?? a.anchor.year)) -
          Math.abs(b.anchor.year - (opts.year ?? b.anchor.year)) ||
        a.anchor.id.localeCompare(b.anchor.id),
    )
    .slice(0, limit)
    .map((s) => s.anchor)
}
