import { z } from 'zod'

/**
 * Every row in Uchronia knows where it came from (§3 cross-cutting rules).
 * Generated rows carry the model, the prompt template id + version that shaped
 * them, a timestamp, and whether the provider was mock or live. Human-curated
 * data (the baseline dataset, the starter gallery) is marked curated.
 */
export const GeneratedProvenance = z.object({
  kind: z.literal('generated'),
  model: z.string().min(1),
  templateId: z.string().min(1),
  templateVersion: z.string().min(1),
  generatedAt: z.iso.datetime(),
  mode: z.enum(['mock', 'live']),
})
export type GeneratedProvenance = z.infer<typeof GeneratedProvenance>

export const CuratedProvenance = z.object({
  kind: z.literal('curated'),
})
export type CuratedProvenance = z.infer<typeof CuratedProvenance>

/** User-authored rows (freeform POD text, titles typed by hand). */
export const UserProvenance = z.object({
  kind: z.literal('user'),
})
export type UserProvenance = z.infer<typeof UserProvenance>

export const Provenance = z.discriminatedUnion('kind', [
  GeneratedProvenance,
  CuratedProvenance,
  UserProvenance,
])
export type Provenance = z.infer<typeof Provenance>
