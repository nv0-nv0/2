# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3210 \
    NV0_RUNTIME_DIR=/tmp/nv0-runtime \
    NV0_FALLBACK_RUNTIME_DIR=/tmp/nv0-runtime

FROM base AS source
COPY package*.json ./
COPY server ./server
COPY apps ./apps
COPY shared ./shared
COPY docs ./docs
COPY scripts ./scripts
COPY deploy/entrypoint.sh ./deploy/entrypoint.sh
COPY deploy/postgres ./deploy/postgres

FROM base AS runtime
RUN apk add --no-cache curl postgresql-client \
  && addgroup -S nv0 && adduser -S nv0 -G nv0 \
  && mkdir -p /app/runtime/data /app/runtime/uploads /app/runtime/backups /app/runtime/reports
COPY --from=source --chown=nv0:nv0 /app /app
RUN chmod +x /app/deploy/entrypoint.sh \
  && chown -R nv0:nv0 /app/runtime
USER nv0
EXPOSE 3210
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=10 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-3210}/healthz" || exit 1
STOPSIGNAL SIGTERM
ENTRYPOINT ["/app/deploy/entrypoint.sh"]
CMD ["node", "server/index.mjs"]
