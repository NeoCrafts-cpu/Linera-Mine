# ===================================
# Linera Mine Backend
# ===================================
# Simple Node.js backend with JSON file-based storage
# For jobs, agents, and user management

FROM node:20-slim

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/index.ts ./src/

# Build TypeScript
RUN npm run build

# Create data directory for JSON files
RUN mkdir -p /data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

# Start the server
CMD ["npm", "start"]
