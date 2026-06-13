FROM node:20-bookworm-slim AS build

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci --no-audit --no-fund

COPY src ./src
RUN npx tsc -p tsconfig.json

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium \
    ffmpeg \
    fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
  && npm cache clean --force

COPY --from=build /app/dist ./dist

RUN mkdir -p downloads .wwebjs_auth .wwebjs_cache \
  && chown -R node:node /app

USER node

VOLUME ["/app/downloads", "/app/.wwebjs_auth", "/app/.wwebjs_cache"]

CMD ["node", "dist/main.js"]
