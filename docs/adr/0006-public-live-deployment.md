# ADR-0006: a public deployment may spend for its visitors, metered

- Status: accepted
- Date: 2026-07-30
- Amends: ADR-0005 (the spending gate), which stands except where noted

## Context

ADR-0005 gave a public deployment three brakes and one door: a passphrase, a
per-IP rate limit, and a UTC-day token ledger. The door turned out to be the
problem. A visitor arriving at the deployed instance sees a full composer, types
a divergence, presses the button and gets a 401 telling them to produce a
passphrase they were never going to have. The demo chronicles are open to them,
but the thing the release exists to demonstrate is not.

That is the correct posture for an instance whose key is the owner's private
one. It is the wrong posture for an instance whose owner has decided the key is
the public's to spend. ADR-0005 had no way to express the second intent, so it
treated every key on a serverless runtime as the first.

## Decision

A third posture: `UCHRONIA_PUBLIC_LIVE=1`. With it, anonymous visitors derive
live, and the meters that were previously behind the passphrase become the only
thing in front of them.

**1. The opt-in is explicit and cannot be inferred.** A key on a serverless
runtime is still refused by default. It goes live only when the environment
says how it is meant to be spent: `UCHRONIA_ACCESS_TOKEN` (the owner's, behind a
passphrase) or `UCHRONIA_PUBLIC_LIVE` (the public's, behind the meters). ADR-0005's
fail-safe direction is unchanged; what changes is that there are now two ways to
say yes, and both have to be typed.

**2. Turning it on cannot leave it unmetered.** Enabling the posture also
enables, unless each is explicitly overridden: a per-visitor daily allowance
(`UCHRONIA_VISITOR_TOKEN_BUDGET`, default 150,000 tokens), the instance day
ledger, and the per-IP rate limit. The last two previously defaulted on only for
serverless; they now key off exposure, so a public container is capped the same
way Vercel is. A single run's ceiling (`UCHRONIA_MAX_RUN_TOKENS`) defaults down
to one visitor's whole allowance, because the gate checks the ledger between
requests and without that a single long chronicle could overshoot it by an order
of magnitude before the next check ran.

**3. The passphrase becomes an override rather than a door.** Where both are
configured, an unlocked session skips the per-visitor allowance: the owner is
not a visitor. Nobody skips the instance day ledger. That one is the invoice.

**4. Owner and unlocked are different questions.** `isUnlocked` reports true
whenever no passphrase is configured, which is right for "is anything barring
this request" and wrong for "whose allowance is this". On a public instance
nobody has a passphrase and everybody is a visitor, so conflating the two would
meter no one. `isOwner` answers the second question and is what the gate and
`/api/config` use.

**5. Metering moves to the provider.** M24 charged the day's ledger from inside
the generation route, which was every route anyone was expected to reach on a
passphrase instance. Once visitors can spend, that is a hole: expanding an era,
asking the archivist, forging an artifact, running a pulse and forking all reach
the provider and none of them touched the ledger. The charge now sits in a
wrapper around `LLMProvider.complete`, so every spending route is metered,
including ones not yet written. Attribution rides an `AsyncLocalStorage` scope
opened by the gate, which survives into the SSE stream because Hono starts the
stream callback synchronously inside the handler.

## Consequences

The instance is now a public endpoint that bills its owner, deliberately. At the
default 2,000,000 tokens per UTC day, that is on the order of ten to forty US
dollars a day at current generation-model pricing, depending on how much of the
traffic is symposium derivations. The owner sets the number; this codebase only
guarantees there is one.

ADR-0005's honest limitation carries over unchanged and matters more here: the
rate limiter and both ledgers are in-memory and per instance, so a cold start
resets them and concurrent instances each keep their own count. The effective
cap is the configured one times the number of warm instances. Per-IP metering
inherits the usual weakness of per-IP anything, and the ledger sheds its whole
map rather than evicting cleverly when it grows past its cap, which fails toward
generosity. These are brakes on casual abuse, not a billing system. The layer
that actually bounds the loss is the provider-side spend limit on the account,
which the owner sets and this codebase cannot. **An operator turning this
posture on should set that limit first.**

Nothing here weakens the secret discipline. The key still lives only in
`config.ts`, is never logged or serialized, and `/api/config` still reports only
booleans and token counts.
