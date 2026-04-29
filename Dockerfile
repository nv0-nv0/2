FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3210 \
    NV0_RUNTIME_DIR=/app/runtime

COPY package*.json ./
COPY server ./server
COPY apps ./apps
COPY shared ./shared
COPY docs ./docs
COPY scripts ./scripts
COPY deploy/entrypoint.sh ./deploy/entrypoint.sh

RUN apk add --no-cache curl \
  && mkdir -p /app/runtime/data /app/runtime/uploads /app/runtime/backups /app/runtime/reports \
  && chown -R node:node /app \
  && chmod +x /app/deploy/entrypoint.sh

USER node

VOLUME ["/app/runtime"]
EXPOSE 3210

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=10 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-3210}/healthz" || exit 1

ENTRYPOINT ["/app/deploy/entrypoint.sh"]
