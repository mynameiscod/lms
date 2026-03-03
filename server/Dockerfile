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
COPY package*.json ./
COPY .env ./
RUN npm install --production
COPY --from=builder /app/dist ./dist
EXPOSE 5000
CMD ["node", "dist/server.js"]
