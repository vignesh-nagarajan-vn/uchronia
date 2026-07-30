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
  // Long function words. The title-hit weighting below reads any 5+ character
  // word as specific evidence, so these have to be dropped by name or a
  // preposition outranks a proper noun ("rise AGAINST Afrikaans" once tied
  // "CONSTANTINOPLE falls" for "Constantinople held against the siege").
  'against',
  'into',
  'from',
  'over',
  'under',
  'between',
  'among',
  'through',
  'throughout',
  'across',
  'behind',
  'beyond',
  'within',
  'above',
  'below',
  'about',
  'around',
  'toward',
  'towards',
  'upon',
  'while',
  'whilst',
  'until',
  'unless',
  'since',
  'than',
  'then',
  'though',
  'although',
  'because',
  'but',
  'yet',
  'still',
  'also',
  'just',
  'even',
  'ever',
  'only',
  'once',
  'again',
  'more',
  'most',
  'less',
  'least',
  'much',
  'many',
  'some',
  'such',
  'any',
  'all',
  'both',
  'each',
  'every',
  'other',
  'another',
  'same',
  'own',
  'here',
  'where',
  'them',
  'they',
  'she',
  'him',
  'our',
  'ours',
  'your',
  'yours',
  'being',
  'has',
  'having',
  'will',
  'shall',
  'should',
  'can',
  'cannot',
  'may',
  'might',
  'must',
  'get',
  'got',
  'goes',
  'went',
  'gone',
  'make',
  'made',
  'take',
  'taken',
  'come',
  'came',
  'give',
  'given',
  'put',
  'let',
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
 * How much a title hit is worth, 1/3 (generic) to 1 (specific). A title word's
 * weight is 3x this, so a specific word scores 3 and a thoroughly common one
 * scores 1, whatever its length.
 */
export type Specificity = (token: string) => number

/**
 * Word length as a crude specificity proxy: the v1 rule, kept as the default
 * so `keywordScore` stays usable without a corpus. It is genuinely bad at the
 * job ("moon" is more specific than "program" and shorter), which is why
 * anything ranking against the real baseline passes `corpusSpecificity`.
 */
export const lengthSpecificity: Specificity = (token) => (token.length >= 5 ? 1 : 1 / 3)

/** A title word appearing in this many anchors or fewer counts as fully specific. */
const DF_SPECIFIC = 4

const indexCache = new WeakMap<readonly BaselineAnchor[], Map<string, number>>()

function titleDocumentFrequencies(anchors: readonly BaselineAnchor[]): Map<string, number> {
  const cached = indexCache.get(anchors)
  if (cached) return cached
  const df = new Map<string, number>()
  for (const anchor of anchors) {
    for (const token of new Set(tokenize(anchor.title))) df.set(token, (df.get(token) ?? 0) + 1)
  }
  indexCache.set(anchors, df)
  return df
}

/**
 * Specificity derived from the corpus itself (v2/M16): a word occurring in
 * few anchor titles is evidence, one occurring in hundreds is noise. This
 * replaces the length proxy wherever the baseline is at hand, and it gets
 * sharper as the baseline densifies rather than blunter. Pure and
 * deterministic; the per-corpus index is memoized on the array identity.
 */
export function corpusSpecificity(anchors: readonly BaselineAnchor[]): Specificity {
  const df = titleDocumentFrequencies(anchors)
  const total = anchors.length
  if (total === 0) return lengthSpecificity
  const ceiling = Math.log((total + 1) / (DF_SPECIFIC + 1))
  if (ceiling <= 0) return lengthSpecificity
  return (token) => {
    const seen = df.get(token) ?? 0
    const idf = Math.log((total + 1) / (seen + 1))
    return Math.min(1, Math.max(1 / 3, idf / ceiling))
  }
}

/**
 * Keyword evidence only. A specific title word ("constantinople") weighs 3; a
 * thoroughly common one ("war") weighs 1, so a lone generic word never
 * outranks real evidence. Summary hits weigh 1, region-name hits 2, and
 * theme-tag hits 2 (v2/M16: "plague", "trade", "war" reach anchors whose
 * titles say it otherwise).
 */
export function keywordScore(
  anchor: BaselineAnchor,
  queryTokens: readonly string[],
  specificity: Specificity = lengthSpecificity,
): number {
  const title = new Set(tokenize(anchor.title))
  const summary = new Set(tokenize(anchor.summary))
  const region = new Set(tokenize(anchor.region))
  const tagWords = new Set(anchor.tags.flatMap((tag) => tag.split('-')))
  let score = 0
  for (const token of queryTokens) {
    if (title.has(token)) score += 3 * specificity(token)
    else if (summary.has(token)) score += 1
    if (region.has(token)) score += 2
    if (tagWords.has(token)) score += 2
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
  specificity: Specificity = lengthSpecificity,
): number {
  if (queryTokens.length === 0 && (year === undefined || year === null)) return 0
  let score = keywordScore(anchor, queryTokens, specificity)
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
  const specificity = corpusSpecificity(anchors)
  return anchors
    .map((anchor) => ({ anchor, score: scoreAnchor(anchor, tokens, opts.year, specificity) }))
    .filter((s) => s.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Math.abs(a.anchor.year - (opts.year ?? a.anchor.year)) -
          Math.abs(b.anchor.year - (opts.year ?? b.anchor.year)) ||
        // Equal evidence, equal distance: the larger event leads (v2/M16).
        b.anchor.magnitude - a.anchor.magnitude ||
        a.anchor.id.localeCompare(b.anchor.id),
    )
    .slice(0, limit)
    .map((s) => s.anchor)
}
