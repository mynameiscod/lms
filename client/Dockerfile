# React build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm cache clean --force && rm -rf node_modules package-lock.json && npm install --legacy-peer-deps && npm install ajv
COPY . ./
RUN npm run build

# Production nginx server
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
