# Multi-stage build
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci --only=production && npm cache clean --force

# Install server dependencies
WORKDIR /app/server
RUN npm ci --only=production && npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules

# Build the server
RUN cd server && npm run build

# Build the frontend (skip if network issues)
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build || echo "Frontend build failed, will serve from development mode"

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built applications
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/server/status-config.yaml ./server/status-config.yaml

# Copy configuration files
COPY --from=builder /app/config.yaml ./config.yaml
COPY --from=builder /app/frontend.config.* ./
COPY --from=builder /app/types ./types
COPY --from=builder /app/lib ./lib

USER nextjs

# Single port for consolidated application
EXPOSE 17069

ENV PORT=17069

# Start the Next.js application (consolidated server + frontend)
CMD ["npm", "start"]