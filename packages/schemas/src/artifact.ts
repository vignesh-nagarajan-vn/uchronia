import { z } from 'zod'
import { UlidString } from './ids.js'
import { Provenance } from './provenance.js'

export const ARTIFACT_KINDS = ['newspaper', 'letter', 'encyclopedia', 'poster'] as const
export const ArtifactKind = z.enum(ARTIFACT_KINDS)
export type ArtifactKind = z.infer<typeof ArtifactKind>

/** A front page from inside the timeline. */
export const NewspaperBody = z.object({
  kind: z.literal('newspaper'),
  masthead: z.string().min(1),
  /** e.g. "Alexandria — 14 Thoth, Year 412 of the Common Reckoning". */
  dateline: z.string().min(1),
  headline: z.string().min(1),
  subhead: z.string().nullable(),
  columns: z
    .array(
      z.object({
        heading: z.string().nullable(),
        paragraphs: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1)
    .max(4),
  /** Small notices and advertisements along the bottom. */
  notices: z.array(z.string().min(1)),
})
export type NewspaperBody = z.infer<typeof NewspaperBody>

export const LetterBody = z.object({
  kind: z.literal('letter'),
  from: z.string().min(1),
  to: z.string().min(1),
  place: z.string().min(1),
  dateLabel: z.string().min(1),
  salutation: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
  closing: z.string().min(1),
  signature: z.string().min(1),
  postscript: z.string().nullable(),
})
export type LetterBody = z.infer<typeof LetterBody>

/** An entry from an in-world encyclopedia — not ours. */
export const EncyclopediaBody = z.object({
  kind: z.literal('encyclopedia'),
  encyclopediaTitle: z.string().min(1),
  editionNote: z.string().min(1),
  headword: z.string().min(1),
  entryParagraphs: z.array(z.string().min(1)).min(1),
  seeAlso: z.array(z.string().min(1)),
})
export type EncyclopediaBody = z.infer<typeof EncyclopediaBody>

export const PosterBody = z.object({
  kind: z.literal('poster'),
  headline: z.string().min(1),
  subheadline: z.string().nullable(),
  lines: z.array(z.string().min(1)),
  issuer: z.string().min(1),
  slogan: z.string().nullable(),
})
export type PosterBody = z.infer<typeof PosterBody>

export const ArtifactBody = z.discriminatedUnion('kind', [
  NewspaperBody,
  LetterBody,
  EncyclopediaBody,
  PosterBody,
])
export type ArtifactBody = z.infer<typeof ArtifactBody>

/** Rendering hints the generator may pass to the typographic templates. */
export const StylingHints = z.object({
  tone: z.string().nullable(),
  period: z.string().nullable(),
})
export type StylingHints = z.infer<typeof StylingHints>

export const Artifact = z.object({
  id: UlidString,
  eventId: UlidString,
  kind: ArtifactKind,
  title: z.string().min(1),
  body: ArtifactBody,
  stylingHints: StylingHints,
  provenance: Provenance,
})
export type Artifact = z.infer<typeof Artifact>
