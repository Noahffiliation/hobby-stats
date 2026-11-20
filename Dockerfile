FROM node:26.13.1-alpine3.24 AS base
RUN apk upgrade --no-cache && \
    apk add --no-cache curl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 -G nodejs appuser && \
    rm -rf \
      /usr/local/lib/node_modules \
      /usr/local/bin/npm \
      /usr/local/bin/npx \
      /usr/local/bin/corepack \
      /usr/local/bin/yarn \
      /usr/local/bin/yarnpkg \
      /opt/yarn* \
      /root/.npm \
      /root/.cache

FROM scratch AS runner
COPY --from=base / /

WORKDIR /app

ENV PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY package.json ./package.json
COPY public ./public
COPY api ./api
COPY src ./src

USER appuser

EXPOSE 3000

CMD ["node", "src/server/index.js"]
