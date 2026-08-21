# Base image
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev)
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client and build Nest app
RUN npx prisma generate
RUN npm run build

# Production image
FROM node:18-alpine AS production

WORKDIR /app

# Run as non-root user for security
RUN chown -R node:node /app
USER node

# Copy package files
COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production
RUN npx prisma generate

# Copy built app from builder
COPY --from=builder --chown=node:node /app/dist ./dist

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "run", "start:prod"]
