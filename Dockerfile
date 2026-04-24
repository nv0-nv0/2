FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY server ./server
COPY apps ./apps
COPY shared ./shared
COPY runtime ./runtime
COPY docs ./docs
COPY scripts ./scripts
COPY deploy/entrypoint.sh ./deploy/entrypoint.sh
RUN apk add --no-cache curl \
  && mkdir -p /app/runtime /app/runtime/data /app/runtime/uploads /app/runtime/backups /app/runtime/reports \
  && chown -R node:node /app \
  && chmod +x /app/deploy/entrypoint.sh
ENV HOST=0.0.0.0
USER node
EXPOSE 3000 3210
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 CMD curl -fsS "http://127.0.0.1:${PORT:-3210}/readyz" || exit 1
ENTRYPOINT ["/app/deploy/entrypoint.sh"]
