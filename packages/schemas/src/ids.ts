import { z } from 'zod'

/** Crockford base32, 26 chars - the ULID wire format. All ids in Uchronia are ULIDs. */
export const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/

export const UlidString = z.string().regex(ULID_REGEX, 'expected a ULID')
export type UlidString = z.infer<typeof UlidString>

/** Entity slugs are the short handles LLM output uses to reference entities. */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const Slug = z.string().regex(SLUG_REGEX, 'expected a kebab-case slug')
export type Slug = z.infer<typeof Slug>
