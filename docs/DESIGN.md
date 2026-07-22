# Design — codename RED THREAD

> Skeleton (M0). **This document must be finalized before the first UI commit (M9, per §7.8).** Until then it records the brief's fixed points.

The interface is the archive of a history that never happened: a scholar's ledger being written in real time, with the attested record underneath it in cyanotype blue.

## Fixed points from the brief (§7)

- **Semantic color**: record blue (Prussian, attested history only) · thread red (seal-wax, divergence and causality only) · iron-gall ink · "Survey" paper (cool grey-green, light) / "Nitrate" (blue-black, dark). Color carries meaning; decoration may not steal it.
- **Type**: IM Fell English (ceremonial display ≥ 24px only) · Spectral (body/UI) · IBM Plex Mono (data).
- **Layout**: one strong vertical spine; the fork drawn as one picture — blue baseline splitting, red spine peeling away.
- **Signature**: the red thread — catenary hover-threads to causal ancestors/descendants, ~300ms draw-on, with a non-visual causes/effects fallback.
- **Motion**: ink-in (blur→sharp, ~250ms, staggered); thread draw-on; nothing else moves without reason; `prefers-reduced-motion` renders instantly.
- **Forbidden** (§7.6): warm-cream + terracotta default, near-black + acid green, broadsheet pastiche, glassmorphism, purple gradients, emoji in UI, shadcn/Material silhouettes, decorative numbering.

Full tokens table, type scale, per-view ASCII wireframes, and the signature spec land here before M9 begins, followed by a self-critique pass against §7.6.
