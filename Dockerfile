FROM ghcr.io/puppeteer/puppeteer:24.38.0

ENV NODE_ENV=production \
    NPM_CONFIG_ENGINE_STRICT=false \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_CACHE_DIR=/home/pptruser/.cache/puppeteer \
    YT_DLP_PATH=/app/bin/yt-dlp \
    WWEBJS_AUTH_PATH=/app/.wwebjs_auth \
    WWEBJS_CACHE_PATH=/app/.wwebjs_cache \
    WWEBJS_BOT_LOCK=/tmp/wwebjs_bot.lock

USER root

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --include=dev --no-audit --no-fund

COPY . .

RUN npm run build \
  && npm run install:ytdlp \
  && npm prune --omit=dev \
  && mkdir -p downloads .wwebjs_auth .wwebjs_cache \
  && chown -R pptruser:pptruser /app

USER pptruser

CMD ["npm", "start"]
