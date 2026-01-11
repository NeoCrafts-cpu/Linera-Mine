# ===================================
# Linera Backend for Render
# ===================================
# Two-stage build:
# 1. Build Linera CLI from source (cached)
# 2. Run Node.js backend with Linera CLI

# Stage 1: Build Linera CLI
FROM rust:1.86-slim-bookworm AS linera-builder

# Install ALL build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    protobuf-compiler \
    libprotobuf-dev \
    libclang-dev \
    clang \
    cmake \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Build linera CLI
ENV CARGO_PROFILE_RELEASE_LTO=thin
ENV CARGO_PROFILE_RELEASE_CODEGEN_UNITS=16
RUN cargo install --locked linera-service@0.15.8

# Stage 2: Node.js runtime with Linera binary
FROM node:20-slim

# Install runtime dependencies for Linera
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy Linera binary from builder
COPY --from=linera-builder /usr/local/cargo/bin/linera /usr/local/bin/

# Verify linera is working
RUN linera --version

# Create app directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy backend source and build
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm install typescript ts-node @types/node @types/express @types/cors @types/uuid && \
    npx tsc && \
    rm -rf node_modules && \
    npm ci --only=production

# Copy WASM contracts
COPY contracts/*.wasm /app/contracts/

# Create data directory
RUN mkdir -p /data

# Environment variables
ENV PORT=8081
ENV NODE_ENV=production
ENV LINERA_WALLET=/data/wallet.json
ENV LINERA_KEYSTORE=/data/keystore.json
ENV LINERA_STORAGE=rocksdb:/data/storage.db
ENV FAUCET_URL=https://faucet.testnet-conway.linera.net
ENV CONTRACT_PATH=/app/contracts/job-marketplace-contract.wasm
ENV SERVICE_PATH=/app/contracts/job-marketplace-service.wasm

EXPOSE 8081

# Health check
HEALTHCHECK --interval=60s --timeout=30s --start-period=300s --retries=3 \
    CMD curl -sf http://localhost:8081/health || exit 1

CMD ["node", "dist/index.js"]
