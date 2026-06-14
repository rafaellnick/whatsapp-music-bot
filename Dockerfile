FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    YT_DLP_PATH=/app/bin/yt-dlp \
    DENO_PATH=/app/bin/deno \
    WWEBJS_AUTH_PATH=/app/.wwebjs_auth \
    WWEBJS_CACHE_PATH=/app/.wwebjs_cache \
    WWEBJS_BOT_LOCK=/tmp/wwebjs_bot.lock

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium \
    curl \
    fonts-liberation \
    unzip \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci --include=dev --no-audit --no-fund

COPY . .

RUN npm run build \
  && npm run install:ytdlp \
  && npm run install:deno \
  && npm prune --omit=dev \
  && mkdir -p downloads .wwebjs_auth .wwebjs_cache

CMD ["npm", "start"]
