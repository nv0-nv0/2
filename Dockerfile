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
RUN mkdir -p /app/runtime /app/runtime/data /app/runtime/uploads /app/runtime/backups /app/runtime/reports   && chown -R node:node /app   && chmod +x /app/deploy/entrypoint.sh
USER node
EXPOSE 3210
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 CMD node -e "fetch('http://127.0.0.1:3210/readyz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/app/deploy/entrypoint.sh"]
