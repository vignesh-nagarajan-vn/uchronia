# ADR-0005: a public deployment may hold a key only behind a gate

- Status: accepted
- Date: 2026-07-30
- Supersedes: ADR-0003 (deployment posture: mock is public, live is local)

## Context

ADR-0003 settled the v1 posture: the deployed instance runs the deterministic
demo engine, and live derivation happens on the owner's own machine. That was
correct while there was nothing to gate with. It is also limiting: the
deployed instance is the only place most people will ever meet the product,
and demo mode cannot answer the question the release exists to answer.

The obstacle is not technical. A public URL holding a real `ANTHROPIC_API_KEY`
is a public endpoint that bills its owner, and a generation run is not cheap:
a deep-time chronicle is dozens of provider calls, and a symposium derivation
is roughly four times that. One bored visitor with a loop can spend real
money in a minute.

## Decision

A key may be present on a public deployment, but only behind a gate. Three
independent limits, and a configuration that refuses rather than trusts.

**1. The fail-safe direction is demo.** On a serverless runtime, a key with no
`UCHRONIA_ACCESS_TOKEN` is refused: `liveAllowed` is false, `mock` is forced
true, and `apiKey` is dropped from the resolved config so nothing downstream
can reach for it. The instance keeps its key unused and serves demo mode. The
alternative default (trust the key, hope nobody notices the URL) fails in the
direction of an invoice; this one fails in the direction of a stranger reading
canned history, which is what they were getting under ADR-0003 anyway.

Locally there is no such exposure and no such rule: the listener binds
loopback, the key is the owner's, and a key means live.

**2. A passphrase unlocks spending, per session.** `UCHRONIA_ACCESS_TOKEN` is
compared in constant time, including its length, and set as an httpOnly cookie
(secure on serverless). `POST /api/unlock` always answers 200 with the verdict
in the body: the status code must not become an oracle for whether a gate is
configured at all.

**3. Rate and money are capped independently of identity.** A per-IP fixed
window (`UCHRONIA_RATE_LIMIT`, default 20/min on serverless) and a UTC-day
token ledger (`UCHRONIA_DAILY_TOKEN_BUDGET`, default 2,000,000 on serverless)
sit behind the passphrase check, in that order: a locked instance should not
consume anyone's rate budget on the way to a 401. The ledger is charged as a
run spends rather than when it finishes, because a run killed halfway still
cost what it cost.

**Only routes that can reach the provider are gated.** Reading, exporting, the
book, the map, the record room, and every existing chronicle stay open. A
locked instance is a fully readable one.

## Consequences

The rate limiter and the day's ledger are in-memory, per instance. On
serverless that means a cold start resets them and concurrent instances each
keep their own count, so the effective cap is the configured one times the
number of warm instances. This is a real limitation and is accepted: the
limits are a brake on casual abuse, not a billing system, and the layer that
actually bounds the loss is the provider-side spend limit on the account,
which the owner sets and this codebase cannot.

`UCHRONIA_MAX_RUN_TOKENS` (per run) remains the third brake and is unchanged.

Nothing here weakens the secret discipline: the key still lives only in
`config.ts`, is never logged or serialized, and `pnpm check:secrets` still
runs in CI and before every push. The passphrase is treated the same way, and
`/api/config` reports only whether a gate exists and whether this session is
past it.

The live half of the WW2 gate still verifies on the deployment rather than
this machine (ADR-0004 is unchanged): what M24 provides is the safety that
makes turning the key on there a reasonable thing to do.
