FROM node:22-alpine AS build

WORKDIR /app

# Install system deps for native modules (@duckdb/node-api)
RUN apk add --no-cache python3 make g++ curl

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Only production deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy built output
COPY --from=build /app/dist ./dist

# Copy engine (ES modules JS) and maps directly
COPY engine/ ./engine/
COPY maps/    ./maps/
COPY dashboards/ ./dashboards/

RUN mkdir -p storage/uploads

EXPOSE 8000
CMD ["node", "dist/app.js"]
