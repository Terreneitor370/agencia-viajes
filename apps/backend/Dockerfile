# Build context: raiz del monorepo (necesita el package-lock.json compartido
# para resolver el workspace). Ver docker-compose.yml -> build.context.
#
# Se conserva la forma real del monorepo (/app/apps/backend) en vez de
# aplanarla: asi la resolucion de node_modules de npm workspaces (que hoistea
# dependencias compartidas a la raiz) funciona igual que en local, sin
# adivinar que quedo hoisteado y que no.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Se copian los package.json de TODOS los workspaces, no solo backend: el
# package-lock.json es del monorepo completo y npm ci valida contra la
# estructura de workspaces que declara la raiz (apps/*), aunque solo se
# vaya a instalar uno con --workspace.
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci --workspace=apps/backend --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/backend/package.json apps/backend/package.json
COPY apps/backend/src apps/backend/src
COPY apps/backend/scripts apps/backend/scripts
COPY apps/backend/db apps/backend/db

WORKDIR /app/apps/backend
EXPOSE 3000
CMD ["node", "src/server.js"]
