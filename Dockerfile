# Multi-stage build for React frontend
FROM node:18-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm cache clean --force && rm -rf node_modules package-lock.json && npm install --legacy-peer-deps && npm install ajv
COPY client ./
RUN npm run build

# Backend build stage - compile TypeScript
FROM node:18-alpine AS backend-build
WORKDIR /app
COPY server/package*.json ./
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm install && npm run build

# Final production image
FROM node:18-alpine
WORKDIR /app

# Copy backend compiled JS from build stage
COPY --from=backend-build /app/dist ./dist
COPY server/package*.json ./
COPY server/.env ./
RUN npm install --production

# Copy built frontend
COPY --from=client-build /app/client/build ./client/build

# Expose ports
EXPOSE 5000 3000

# Start backend with compiled JS
CMD ["node", "dist/server.js"]
