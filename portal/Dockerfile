# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .

# Declare all VITE_ build args so docker-compose can pass them in
ARG VITE_API_URL
ARG VITE_DEFAULT_REDIRECT
ARG VITE_APP_NAME
ARG VITE_APP_TAGLINE
ARG VITE_POLICY_TEXT
ARG VITE_TOKEN_KEY

RUN npm run build

# ── Stage 2: serve ────────────────────────────────────────────────────────────
FROM nginx:1.25-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
