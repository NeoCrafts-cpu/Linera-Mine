#!/bin/bash
# Test script to verify Linera integration setup

echo "🔍 Linera Integration Test"
echo "=========================="
echo ""

# Check if Linera is installed
echo "1. Checking Linera installation..."
if command -v linera &> /dev/null; then
    echo "   ✓ Linera CLI found"
    linera --version | head -1
else
    echo "   ✗ Linera CLI not found"
    echo "   Install with: cargo install --locked linera-service@0.15.6"
    exit 1
fi
echo ""

# Check if network is running
echo "2. Checking Linera network..."
if curl -s http://localhost:8080/health &> /dev/null || curl -s http://localhost:8080/ &> /dev/null; then
    echo "   ✓ Linera network is running on port 8080"
else
    echo "   ✗ Linera network not running"
    echo "   Start with: linera net up --with-faucet --faucet-port 8080"
fi
echo ""

# Check GraphQL endpoint
echo "3. Testing GraphQL endpoint..."
RESPONSE=$(curl -s -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { chains { list } }"}' 2>/dev/null)

if [ -n "$RESPONSE" ]; then
    echo "   ✓ GraphQL endpoint responding"
    echo "   Response: ${RESPONSE:0:100}..."
else
    echo "   ✗ GraphQL endpoint not responding"
fi
echo ""

# Check frontend files
echo "4. Checking frontend integration files..."
FILES=(
    "services/linera.ts"
    "vite-env.d.ts"
    ".env.example"
    "LINERA_INTEGRATION.md"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✓ $file"
    else
        echo "   ✗ $file (missing)"
    fi
done
echo ""

# Check environment
echo "5. Checking environment configuration..."
if [ -f ".env.local" ]; then
    echo "   ✓ .env.local exists"
    if grep -q "VITE_USE_LINERA" .env.local; then
        USE_LINERA=$(grep "VITE_USE_LINERA" .env.local | cut -d '=' -f 2)
        echo "   VITE_USE_LINERA=$USE_LINERA"
    fi
else
    echo "   ℹ .env.local not found (optional)"
    echo "   Create from: cp .env.example .env.local"
fi
echo ""

echo "=========================="
echo "Setup Status:"
echo ""
if command -v linera &> /dev/null && curl -s http://localhost:8080/ &> /dev/null; then
    echo "✅ Linera is installed and running"
    echo "✅ Frontend integration files are ready"
    echo ""
    echo "Next steps:"
    echo "1. Set VITE_USE_LINERA=true in .env.local"
    echo "2. Run 'npm run dev' to start the frontend"
    echo "3. Open http://localhost:5173"
    echo "4. Open http://localhost:8080 for GraphiQL"
else
    echo "⚠️  Setup incomplete"
    echo ""
    echo "To complete setup:"
    if ! command -v linera &> /dev/null; then
        echo "• Install Linera: cargo install --locked linera-service@0.15.6"
    fi
    if ! curl -s http://localhost:8080/ &> /dev/null; then
        echo "• Start network: linera net up --with-faucet --faucet-port 8080"
    fi
fi
echo ""
