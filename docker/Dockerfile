FROM node:24-alpine AS builder
LABEL author="ARDI"

ENV NODE_ENV=production
WORKDIR /app

ARG BUILD_SARDI_BACKEND_URL
ENV BUILD_SARDI_BACKEND_URL=${BUILD_SARDI_BACKEND_URL}

COPY package.json package-lock.json ./

RUN npm ci --include=dev --include=optional

COPY . .

ARG NEXT_PUBLIC_VERSION=Dev
ENV NEXT_PUBLIC_VERSION=${NEXT_PUBLIC_VERSION}

RUN npm run build

FROM node:24-slim AS runner
LABEL author="ARDI"

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=5 \
  CMD curl -fsS http://127.0.0.1:3000/ || exit 1

ENTRYPOINT ["node", "server.js"]
