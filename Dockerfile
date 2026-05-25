# Multi-stage build for React frontend
FROM node:18-alpine AS client-build
WORKDIR /app/client

# Copy package.json first for better caching
COPY client/package*.json ./

# Clear cache and install dependencies with ajv fix
RUN npm cache clean --force && \
    rm -rf node_modules package-lock.json && \
    npm install --legacy-peer-deps --no-audit --prefer-offline || npm install --legacy-peer-deps --no-audit && \
    npm install ajv@^8.12.0 ajv-keywords@^5.1.0 --save-dev --legacy-peer-deps --no-audit

# Copy all client source files
COPY client ./

# Build the React app with increased memory and version info
ARG BUILD_DATE
ARG APP_VERSION=1.1.0
ENV NODE_OPTIONS="--max-old-space-size=4096" \
    REACT_APP_VERSION=${APP_VERSION} \
    REACT_APP_BUILD_DATE=${BUILD_DATE}
RUN npm run build

# Verify build output exists
RUN ls -la build/ && \
    test -f build/index.html || (echo "❌ Build failed - no index.html found!" && exit 1)

# Backend build stage - compile TypeScript
FROM node:18-alpine AS backend-build
WORKDIR /app

# Copy package.json and tsconfig first
COPY server/package*.json ./
COPY server/tsconfig.json ./

# Install dependencies
RUN npm install --no-audit --prefer-offline || npm install --no-audit

# Copy source code and build
COPY server/src ./src
RUN npm run build

# Verify backend build output
RUN ls -la dist/ && \
    test -f dist/server.js || (echo "❌ Backend build failed - no server.js found!" && exit 1)

# Final production image
FROM node:18-alpine
WORKDIR /app

# Copy package.json
COPY server/package*.json ./

# Copy node_modules from build stage and prune dev deps — no network needed
COPY --from=backend-build /app/node_modules ./node_modules
RUN npm prune --omit=dev

# Copy backend compiled JS from build stage
COPY --from=backend-build /app/dist ./dist

# Copy built frontend from build stage
COPY --from=client-build /app/client/build ./client/build

# Verify all files are in place
RUN echo "📦 Verifying production build..." && \
    ls -la && \
    ls -la client/ && \
    ls -la client/build/ && \
    test -f client/build/index.html && \
    test -f dist/server.js && \
    echo "✅ All files verified successfully!"

# Expose ports
EXPOSE 5000 3000

# Start backend with compiled JS
CMD ["node", "dist/server.js"]
