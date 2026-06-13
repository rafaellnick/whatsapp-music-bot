FROM node:20-bookworm-slim AS build

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci --no-audit --no-fund

COPY src ./src
RUN npx tsc -p tsconfig.json

FROM ghcr.io/puppeteer/puppeteer:23.3.0 AS runtime

USER root

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    XDG_CONFIG_HOME=/tmp/.chromium \
    XDG_CACHE_HOME=/tmp/.chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
  && ln -sf "$(node -p "require('ffmpeg-static')")" /usr/local/bin/ffmpeg \
  && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p downloads .wwebjs_auth .wwebjs_cache /tmp/.chromium \
  && chmod +x docker-entrypoint.sh \
  && chown -R pptruser:pptruser /app /tmp/.chromium

VOLUME ["/app/downloads", "/app/.wwebjs_auth", "/app/.wwebjs_cache"]

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
