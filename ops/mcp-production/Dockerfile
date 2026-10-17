FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
COPY shared/package.json shared/package.json
RUN npm ci --workspace=server --workspace=shared --include-workspace-root=false --no-audit --no-fund
COPY server/src server/src
COPY server/tsconfig.json server/tsconfig.json
RUN npm run build --workspace=server
RUN npm prune --omit=dev --workspace=server --workspace=shared --include-workspace-root=false --no-audit --no-fund && mkdir -p server/node_modules

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/node_modules ./server/node_modules
COPY --from=build /app/server/dist ./server/dist
COPY ops/mcp-production/settings.cjs ops/mcp-production/serve.cjs ops/mcp-production/operator.cjs ./ops/mcp-production/
USER node
CMD ["node", "ops/mcp-production/serve.cjs"]
