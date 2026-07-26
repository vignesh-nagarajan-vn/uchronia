# Security

## Reporting

Uchronia is a local-first hobby project. If you find a vulnerability, please open a GitHub issue **without** exploit details and say you'd like a private channel, or use GitHub's private vulnerability reporting on this repository. Expect a best-effort response, not an SLA.

## Model

- `ANTHROPIC_API_KEY` lives server-side only (`apps/server/src/config.ts`), is never logged, never serialized into responses, and never reaches the client. Routes may expose `keyConfigured` (a boolean) at most.
- The server binds `127.0.0.1` by default (`UCHRONIA_HOST` widens it; the container image sets `0.0.0.0` because a container must listen beyond loopback) and ships **no authentication**. Do not expose a live-mode instance (one holding a key) to the public internet; every visitor could spend your key. Mock mode holds no secrets and is safe to host; the provided Dockerfile defaults to mock.
- Imports are schema-validated and machine-validated before persistence, and request bodies are capped at 16 MB (hosting platforms may cap lower - Vercel around 4.5 MB).
- Generated content is speculative fiction produced by a language model. Treat it as untrusted text: it is rendered as text, never executed or interpreted.
