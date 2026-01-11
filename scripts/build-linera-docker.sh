#!/bin/bash
# Build Linera binary using Docker (no local Rust needed)
# This creates a Linux x86_64 binary that can be uploaded to GitHub Releases

set -e

echo "=== Building Linera CLI in Docker ==="

# Create a temporary Dockerfile for building
cat > /tmp/Dockerfile.linera-build << 'EOF'
FROM rust:1.86-slim-bookworm

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
    && rm -rf /var/lib/apt/lists/*

ENV CARGO_PROFILE_RELEASE_LTO=thin
ENV CARGO_PROFILE_RELEASE_CODEGEN_UNITS=16

RUN cargo install --locked linera-service@0.15.8

RUN cp /usr/local/cargo/bin/linera /linera-linux-x86_64 && \
    chmod +x /linera-linux-x86_64

CMD ["cp", "/linera-linux-x86_64", "/output/"]
EOF

echo "Building Docker image (this takes 15-20 minutes)..."
docker build -t linera-builder -f /tmp/Dockerfile.linera-build /tmp

echo "Extracting binary..."
mkdir -p ./bin
docker run --rm -v "$(pwd)/bin:/output" linera-builder

echo ""
echo "=== Build Complete ==="
ls -lah ./bin/linera-linux-x86_64
echo ""
echo "Binary saved to: ./bin/linera-linux-x86_64"
echo ""
echo "Next steps:"
echo "1. Create a GitHub release: gh release create v0.15.8 --title 'Linera Binary v0.15.8'"
echo "2. Upload the binary: gh release upload v0.15.8 ./bin/linera-linux-x86_64"
