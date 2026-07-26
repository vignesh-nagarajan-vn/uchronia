# Uchronia, the single-container edition.
#
#   docker build -t uchronia .
#   docker run -p 8787:8787 -v uchronia-data:/data uchronia
#
# Serves the built web app and the API from one port, keyless, on the
# deterministic mock engine. For live generation pass the key and unset mock:
#   docker run -p 8787:8787 -v uchronia-data:/data \
#     -e UCHRONIA_MOCK=0 -e ANTHROPIC_API_KEY=sk-... uchronia
# (Do NOT expose a live-mode container publicly: there is no auth, and every
# visitor would spend your key. Mock mode is safe to host.)

FROM node:22-bookworm-slim AS build
RUN corepack enable pnpm
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @uchronia/web build

# The runtime keeps the workspace (tsx runs the server from source: simple,
# identical to dev, and better-sqlite3's prebuilt binary comes along free).
FROM node:22-bookworm-slim
RUN corepack enable pnpm
WORKDIR /app
COPY --from=build /app /app
ENV NODE_ENV=production \
    UCHRONIA_MOCK=1 \
    UCHRONIA_PORT=8787 \
    UCHRONIA_HOST=0.0.0.0 \
    UCHRONIA_DB=/data/uchronia.db \
    UCHRONIA_STATIC_DIR=/app/apps/web/dist \
    UCHRONIA_MOCK_PACE_MS=250
VOLUME /data
EXPOSE 8787
WORKDIR /app/apps/server
CMD ["pnpm", "start"]
