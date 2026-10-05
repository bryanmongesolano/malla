# Multi-stage build for Malla Curricular (CENFOTEC)
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build both frontend and server bundle
COPY . .
RUN npm run build

# Production runner
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3009 \
    DATABASE_PATH=/app/data-db/malla.db

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled artifacts and curriculum definition
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY data/curriculum.json ./data/curriculum.json

# Expose internal service port
EXPOSE 3009

# Start production server
CMD ["node", "dist-server/index.js"]
