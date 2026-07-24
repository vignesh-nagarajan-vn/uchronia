# ADR-0003: Deployment posture: mock is public, live is local

**Status**: accepted, 2026-07-23

## Context

Uchronia holds an Anthropic API key server-side and has no authentication layer. People want three different things from "deploying" it: showing a finished chronicle, letting others play with the product, and generating real history. Conflating them is how keys get drained.

## Decision

Three tiers, each with its own mechanism, none pretending to be another:

1. **Showcase**: the self-contained static HTML export of any branch, attached to a GitHub Release or handed around as a file. Deliberately not published under the account's GitHub Pages, which would serve it beneath the owner's personal domain; this project stays unassociated with it. No backend exists to secure.
2. **Playable demo**: two shapes, both defaulting to mock mode. The Dockerfile (one container serves web and API via `UCHRONIA_STATIC_DIR` + SPA fallback; history persists in a `/data` volume), and a zero-config Vercel setup (`vercel.json` + `api/index.ts` running the whole Hono app as one function, SQLite in `/tmp` per instance, showcase chronicle seeded on cold start). Serverless state is deliberately ephemeral: a playground, not an archive.
3. **Live generation**: local only (`pnpm dev`, or the container with a key passed explicitly). Not for public exposure, ever, until an auth layer exists. `UCHRONIA_MAX_RUN_TOKENS` caps any single run's spend as a seatbelt, not a substitute for the rule.

Rather than building auth for a single-user tool, the posture is enforced by defaults: every published artifact of this repo is keyless out of the box, and turning the key on requires two deliberate acts (`UCHRONIA_MOCK=0` *and* providing the key).

## Consequences

- The public surfaces (the image, the exported files) carry no standing cost or abuse surface.
- Anyone who wants a multi-user hosted Uchronia inherits an explicit prerequisite: an authentication layer and per-user keys or budgets. Recorded here so the gap is a decision, not an oversight.
- The runtime image keeps the pnpm workspace and runs the server via tsx: larger than a bundled image, but identical to the tested dev path (better-sqlite3's prebuilt binary, drizzle migrations, and export fonts all resolve exactly as in development). Image-size optimization is deferred until someone actually needs it.
