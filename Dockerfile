FROM rust:1.86-slim

SHELL ["bash", "-c"]

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    protobuf-compiler \
    clang \
    make \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Linera tools (matching SDK version 0.15.8)
RUN cargo install --locked linera-service@0.15.8 linera-storage-service@0.15.8

# Install Node.js via nvm
RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.40.3/install.sh | bash \
    && . ~/.nvm/nvm.sh \
    && nvm install lts/krypton \
    && npm install -g pnpm

# Add wasm target for contract compilation
RUN rustup target add wasm32-unknown-unknown

WORKDIR /build

# Healthcheck - wait for frontend
HEALTHCHECK --interval=5s --timeout=3s --start-period=60s --retries=10 \
    CMD curl -sf http://localhost:5173 || exit 1

ENTRYPOINT ["bash", "/build/run.bash"]
