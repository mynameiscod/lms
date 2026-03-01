# Multi-stage build for React frontend
FROM node:18-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --legacy-peer-deps
COPY client ./
RUN npm run build

# Backend and final image
FROM node:18-alpine
WORKDIR /app

# Install MongoDB (optional - use MongoDB Atlas instead for production)
# RUN apk add --no-cache mongodb

# Copy backend
COPY server/package*.json ./
RUN npm install --production

# Copy built frontend
COPY --from=client-build /app/client/build ./client/build

# Copy server source
COPY server/src ./src
COPY server/tsconfig.json ./

# Copy environment file (will be overridden at runtime)
COPY server/.env* ./

# Expose ports
EXPOSE 5000 3000

# Start backend (which also serves frontend)
CMD ["node", "-r", "ts-node/register", "src/server.ts"]
