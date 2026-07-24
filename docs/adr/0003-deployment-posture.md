# ADR-0003: Deployment posture — mock is public, live is local

**Status**: accepted, 2026-07-23

## Context

Uchronia holds an Anthropic API key server-side and has no authentication layer. People want three different things from "deploying" it: showing a finished chronicle, letting others play with the product, and generating real history. Conflating them is how keys get drained.

## Decision

Three tiers, each with its own mechanism, none pretending to be another:

1. **Showcase** — the self-contained static HTML export of the demo branch, published to GitHub Pages by `.github/workflows/pages.yml` on every push to main. No backend exists to secure.
2. **Playable demo** — the Dockerfile, which **defaults to mock mode** (`UCHRONIA_MOCK=1`): deterministic, keyless, safe to expose publicly. One container serves web and API (`UCHRONIA_STATIC_DIR` + SPA fallback); history persists in a `/data` volume.
3. **Live generation** — local only (`pnpm dev`, or the container with a key passed explicitly). Not for public exposure, ever, until an auth layer exists. `UCHRONIA_MAX_RUN_TOKENS` caps any single run's spend as a seatbelt, not a substitute for the rule.

Rather than building auth for a single-user tool, the posture is enforced by defaults: every published artifact of this repo (Pages, image) is keyless out of the box, and turning the key on requires two deliberate acts (`UCHRONIA_MOCK=0` *and* providing the key).

## Consequences

- The public surfaces can be linked freely in the README without a standing cost or abuse surface.
- Anyone who wants a multi-user hosted Uchronia inherits an explicit prerequisite: an authentication layer and per-user keys or budgets. Recorded here so the gap is a decision, not an oversight.
- The runtime image keeps the pnpm workspace and runs the server via tsx — larger than a bundled image, but identical to the tested dev path (better-sqlite3's prebuilt binary, drizzle migrations, and export fonts all resolve exactly as in development). Image-size optimization is deferred until someone actually needs it.
