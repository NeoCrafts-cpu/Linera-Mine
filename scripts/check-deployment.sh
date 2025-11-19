#!/bin/bash

# Pre-Deployment Checklist Script
# Verifies your app is ready for deployment

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

echo "════════════════════════════════════════════════════════"
echo -e "${BLUE}🔍 Linera Marketplace Pre-Deployment Checklist${NC}"
echo "════════════════════════════════════════════════════════"
echo ""

# Check 1: Rust version
echo -n "🦀 Rust version (1.86.0 required)... "
if command -v rustc &> /dev/null; then
    RUST_VERSION=$(rustc --version | awk '{print $2}')
    if [[ "$RUST_VERSION" == "1.86.0" ]]; then
        echo -e "${GREEN}✅ $RUST_VERSION${NC}"
    else
        echo -e "${YELLOW}⚠️  $RUST_VERSION (should be 1.86.0)${NC}"
        WARNINGS=$((WARNINGS+1))
    fi
else
    echo -e "${RED}❌ Not installed${NC}"
    ERRORS=$((ERRORS+1))
fi

# Check 2: Linera CLI
echo -n "⛓️  Linera CLI... "
if command -v linera &> /dev/null; then
    LINERA_VERSION=$(linera --version 2>&1 | head -1 || echo "unknown")
    echo -e "${GREEN}✅ Installed${NC}"
else
    echo -e "${RED}❌ Not installed${NC}"
    ERRORS=$((ERRORS+1))
fi

# Check 3: Node.js
echo -n "📦 Node.js (v16+ required)... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 16 ]; then
        echo -e "${GREEN}✅ v$(node --version | cut -d'v' -f2)${NC}"
    else
        echo -e "${YELLOW}⚠️  v$(node --version | cut -d'v' -f2) (v16+ recommended)${NC}"
        WARNINGS=$((WARNINGS+1))
    fi
else
    echo -e "${RED}❌ Not installed${NC}"
    ERRORS=$((ERRORS+1))
fi

# Check 4: Contract build
echo -n "🔨 Smart contract compiled... "
if [ -f "linera-contracts/job-marketplace/target/wasm32-unknown-unknown/release/job-marketplace-contract.wasm" ]; then
    SIZE=$(du -h linera-contracts/job-marketplace/target/wasm32-unknown-unknown/release/job-marketplace-contract.wasm | awk '{print $1}')
    echo -e "${GREEN}✅ Yes ($SIZE)${NC}"
else
    echo -e "${YELLOW}⚠️  Not found (run: cd linera-contracts/job-marketplace && cargo build --release --target wasm32-unknown-unknown)${NC}"
    WARNINGS=$((WARNINGS+1))
fi

# Check 5: Frontend dependencies
echo -n "📚 Frontend dependencies... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ Installed${NC}"
else
    echo -e "${YELLOW}⚠️  Missing (run: npm install)${NC}"
    WARNINGS=$((WARNINGS+1))
fi

# Check 6: .env.local configuration
echo -n "⚙️  Environment configuration... "
if [ -f ".env.local" ]; then
    if grep -q "VITE_LINERA_CHAIN_ID" .env.local && \
       grep -q "VITE_LINERA_APP_ID" .env.local && \
       grep -q "VITE_LINERA_WALLET_OWNER" .env.local; then
        echo -e "${GREEN}✅ Configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Incomplete (missing required variables)${NC}"
        WARNINGS=$((WARNINGS+1))
    fi
else
    echo -e "${YELLOW}⚠️  .env.local not found${NC}"
    WARNINGS=$((WARNINGS+1))
fi

# Check 7: Frontend build
echo -n "🎨 Frontend build... "
if [ -d "dist" ]; then
    echo -e "${GREEN}✅ Built${NC}"
else
    echo -e "${YELLOW}⚠️  Not built (run: npm run build)${NC}"
    WARNINGS=$((WARNINGS+1))
fi

# Check 8: Git status
echo -n "📝 Git status... "
if command -v git &> /dev/null; then
    UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l)
    if [ "$UNCOMMITTED" -eq 0 ]; then
        echo -e "${GREEN}✅ Clean${NC}"
    else
        echo -e "${YELLOW}⚠️  $UNCOMMITTED uncommitted changes${NC}"
        WARNINGS=$((WARNINGS+1))
    fi
else
    echo -e "${YELLOW}⚠️  Git not available${NC}"
    WARNINGS=$((WARNINGS+1))
fi

# Check 9: TypeScript errors
echo -n "🔍 TypeScript check... "
if command -v npm &> /dev/null; then
    if npm run type-check > /dev/null 2>&1; then
        echo -e "${GREEN}✅ No errors${NC}"
    else
        echo -e "${YELLOW}⚠️  Has type errors (run: npm run type-check)${NC}"
        WARNINGS=$((WARNINGS+1))
    fi
else
    echo -e "${YELLOW}⚠️  Cannot check${NC}"
fi

# Check 10: Port availability
echo -n "🔌 Port 8081 (GraphQL)... "
if command -v ss &> /dev/null; then
    if ss -tlnp 2>/dev/null | grep -q ":8081"; then
        echo -e "${YELLOW}⚠️  In use${NC}"
        WARNINGS=$((WARNINGS+1))
    else
        echo -e "${GREEN}✅ Available${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Cannot check${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════"

# Summary
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 Perfect! Ready for deployment${NC}"
    echo ""
    echo "Choose your deployment method:"
    echo "  1. Devnet:      ./scripts/deploy-devnet.sh"
    echo "  2. Production:  ./scripts/deploy-production.sh <server-ip> <domain>"
    echo "  3. Vercel:      vercel"
    echo ""
    echo "📚 See DEPLOYMENT_QUICKSTART.md for details"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Ready with $WARNINGS warning(s)${NC}"
    echo ""
    echo "You can proceed with deployment, but consider fixing warnings."
    echo "Run: ./scripts/deploy-devnet.sh"
else
    echo -e "${RED}❌ Not ready - $ERRORS error(s), $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix errors before deploying."
    echo ""
    echo "Quick fixes:"
    if ! command -v rustc &> /dev/null; then
        echo "  • Install Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    fi
    if ! command -v linera &> /dev/null; then
        echo "  • Install Linera: cargo install linera-cli@0.15.6"
    fi
    if ! command -v node &> /dev/null; then
        echo "  • Install Node.js: https://nodejs.org/"
    fi
    echo "  • Build contract: cd linera-contracts/job-marketplace && cargo build --release --target wasm32-unknown-unknown"
    echo "  • Install deps: npm install"
fi

echo "════════════════════════════════════════════════════════"

exit $ERRORS
