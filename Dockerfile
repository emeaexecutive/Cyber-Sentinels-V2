# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22.23.1

FROM node:${NODE_VERSION}-bookworm-slim AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    CYBER_SENTINELS_DOCKER_BUILD=1

# NEXT_PUBLIC_* values are intentionally non-secret, local-only build defaults.
# A Staging qualification image may override them with --build-arg. Never pass
# server credentials or Production configuration as build arguments.
ARG BUILD_VERSION=unknown
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_SUPABASE_URL=http://host.docker.internal:54321
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=local-docker-anon-key-not-a-credential
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=
ARG NEXT_PUBLIC_ENABLE_DEV_AUTH=false
ENV BUILD_VERSION=${BUILD_VERSION} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY} \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY} \
    NEXT_PUBLIC_ENABLE_DEV_AUTH=${NEXT_PUBLIC_ENABLE_DEV_AUTH}

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
WORKDIR /app

ARG BUILD_VERSION=unknown
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    BUILD_VERSION=${BUILD_VERSION}

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# The application exposes a small allowlisted set of Markdown documents at
# runtime. .dockerignore admits only that allowlist, never release evidence.
COPY --from=builder --chown=node:node /app/docs ./docs

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health',{cache:'no-store'}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
