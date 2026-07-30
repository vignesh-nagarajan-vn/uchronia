# ADR-0004: Live-mode gates verify on the deployment, not this machine

**Status**: accepted, 2026-07-29 (user-directed)

## Context

The v2 program (M13-M25) defines several gates that require real Anthropic API
calls: the M13 live smoke (first end-to-end derivation), the M15 critic A/B and
live eval lane, the M23 archivist smoke, the M25 live-derived showcase
chronicles, and the live half of the headline WW2 gate (relevance mean >= 4.0,
scored by a judge model). The program assumed `ANTHROPIC_API_KEY` would land in
the repo-root `.env` before M13's gate.

The owner has decided the key will not be placed on this machine at all: it
will be configured directly in the Vercel dashboard at release time, alongside
the M24 access-token gating that makes a keyed deployment safe.

## Decision

- Every live-only gate is **deferred to the deployed instance**, not dropped.
  The machinery each gate needs (eval harness with a live lane, critic A/B
  fixtures and runner, live-check endpoint, cost meter, usage plumbing) is
  built, unit-tested against injected stubs, and left one command or one click
  away from execution once a key exists.
- Every demo/mock-side gate remains **fully enforced locally and in CI**: the
  demo half of the WW2 gate, the mock eval lane, the e2e journey, the fake-
  Vercel smoke, and the full test matrix. Mock parity stays a law, so every
  live feature has a deterministic twin that CI exercises keyless.
- The critic-tier decision (M15) defaults to keeping Haiku with the A/B
  recorded as *pending measurement*; the seeded-violation suite ships so the
  measurement is `pnpm eval:critic` away.
- The M25 showcase chronicles are derived and curated with the demo engine
  (which, after M14/M16, snaps to curated anchors rather than inventing
  centuries); ROADMAP records them as demo-derived, to be re-derived live from
  the deployed instance if the owner chooses.
- v2.0.0 therefore ships with the live path provider-unit-tested, cost-capped,
  and gated, but first exercised against the real API **on Vercel** via the
  live-check endpoint and a first real derivation there. ROADMAP carries this
  caveat in the open threads until someone confirms the live WW2 gate on the
  deployment.

## Consequences

- No risk of key material ever touching this working tree; the secret scan
  guards the boundary that matters.
- The first real-API exercise happens in the environment that will actually
  serve it, which is where serverless-specific breakage would surface anyway.
- The honest cost: live-path bugs that unit stubs cannot catch (streaming
  edge cases, structured-output quirks, model refusals) surface at deployment
  time rather than during the build. The live-check endpoint, per-run token
  ceiling, and resumable runs (M24) bound the blast radius of that discovery.
