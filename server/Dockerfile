# Backend build - compile TypeScript
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src
RUN npm install && npm run build

# Production runtime
FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache fontconfig ttf-dejavu
COPY package*.json ./
COPY .env ./
# Copy node_modules from builder and prune — no second npm install needed
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 5000
CMD ["node", "dist/server.js"]
