# ── Stage 1: Build the Expo web export ────────────────────────────────────────
FROM node:20-alpine AS builder

# corepack ships with Node 20; enable it so Yarn 4 (Berry) is available
RUN corepack enable

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package.json yarn.lock .yarnrc.yml ./
COPY patches/ ./patches/

# Install all dependencies (immutable = no lockfile changes)
RUN yarn install --immutable

# Copy the rest of the source
COPY . .

# Build the static web bundle into dist/
RUN npx expo export --platform web

# ── Stage 2: Serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine AS server

# Remove the default nginx landing page
RUN rm -rf /usr/share/nginx/html/*

# Copy the built static assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
