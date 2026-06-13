FROM node:20-bookworm-slim AS build

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

RUN npm install -g yarn@1.22.22

COPY package.json yarn.lock tsconfig.json ./
RUN yarn install --frozen-lockfile

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

RUN npm install -g yarn@1.22.22

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=true \
  && yarn cache clean

COPY --from=build /app/dist ./dist

RUN mkdir -p downloads .wwebjs_auth .wwebjs_cache \
  && chown -R node:node /app

USER node

VOLUME ["/app/downloads", "/app/.wwebjs_auth", "/app/.wwebjs_cache"]

CMD ["node", "dist/main.js"]
