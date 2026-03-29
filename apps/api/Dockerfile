FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/audit/package.json ./packages/audit/
COPY packages/iam/package.json ./packages/iam/
COPY packages/compliance/package.json ./packages/compliance/
COPY packages/db/package.json ./packages/db/
COPY packages/storage/package.json ./packages/storage/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --prod

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY tsconfig.base.json ./
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @kern/db run db:generate
RUN pnpm --filter @kern/api run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/*/node_modules ./packages/
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/packages/*/dist ./packages/
EXPOSE 4000
CMD ["node", "dist/main.js"]
