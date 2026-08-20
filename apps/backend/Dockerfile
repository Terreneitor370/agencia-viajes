# Build context: raiz del monorepo (necesita el package-lock.json compartido
# para resolver el workspace). Ver docker-compose.yml -> build.context.
#
# Una sola etapa a proposito: ninguna dependencia de este proyecto compila
# nativo (bcryptjs y mysql2 son JS puro), asi que un build multi-stage no
# ahorraba nada real y en cambio obligaba a copiar node_modules entre
# etapas adivinando donde npm workspaces decide dejar cada paquete (root vs.
# apps/backend/node_modules). Con una sola etapa ese problema desaparece:
# todo queda en el mismo filesystem desde el "npm ci".
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
# Se copian los package.json de TODOS los workspaces, no solo backend: el
# package-lock.json es del monorepo completo y npm ci valida contra la
# estructura de workspaces que declara la raiz (apps/*), aunque solo se
# vaya a instalar uno con --workspace.
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci --workspace=apps/backend --omit=dev

COPY apps/backend/src apps/backend/src
COPY apps/backend/scripts apps/backend/scripts
COPY apps/backend/db apps/backend/db

WORKDIR /app/apps/backend
# Sin EXPOSE: el contenedor corre con network_mode: host (ver
# docker-compose.yml), donde EXPOSE no tiene efecto -- el puerto real lo
# decide PORT en apps/backend/.env.production.
CMD ["node", "src/server.js"]
