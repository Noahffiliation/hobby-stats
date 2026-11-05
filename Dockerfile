FROM node:26.12.1-alpine3.24 AS runner
RUN apk upgrade --no-cache && \
    apk add --no-cache curl && \
    rm -rf \
      /usr/local/lib/node_modules \
      /usr/local/bin/npm \
      /usr/local/bin/npx \
      /usr/local/bin/corepack \
      /root/.npm \
      /root/.cache
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

COPY package.json ./package.json
COPY public ./public
COPY api ./api
COPY src ./src

USER appuser

EXPOSE 3000

CMD ["node", "src/server/index.js"]
