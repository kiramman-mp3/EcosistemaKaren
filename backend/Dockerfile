# Imagen única para store-api y portal-api (ADR-003): cambia solo el comando de arranque.
#   docker build -t karen-backend backend
#   docker run ... karen-backend node index.store.js
#   docker run ... karen-backend node index.portal.js
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY index.js index.store.js index.portal.js ./
COPY src ./src
COPY init-db ./init-db
COPY scripts ./scripts
COPY public ./public
# Sin privilegios de root; el usuario `node` ya viene en la imagen.
USER node
EXPOSE 4000 4001
# La sonda de liveness no toca la base de datos; la readiness (/readyz) la usa el balanceador.
# Cada servicio fija HEALTHCHECK_PORT (tienda 4000, portal 4001).
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node scripts/healthcheck.js
CMD ["node", "index.store.js"]
