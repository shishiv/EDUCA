#!/bin/bash

# Login Retry E2E Tests - Test Runner Script
# Run this script to execute all login retry tests with proper configuration

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Login Retry E2E Tests - Test Runner${NC}"
echo -e "${BLUE}  Fronteira/MG Educational Management System${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed${NC}"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠️  Warning: pnpm not found, using npm instead${NC}"
    PKG_MANAGER="npm"
else
    PKG_MANAGER="pnpm"
fi

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from gestao_fronteira/ directory${NC}"
    exit 1
fi

# Check if dev server is running
echo -e "${BLUE}🔍 Checking if development server is running...${NC}"
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Development server is running${NC}"
else
    echo -e "${YELLOW}⚠️  Development server not detected${NC}"
    echo -e "${BLUE}Starting development server...${NC}"
    $PKG_MANAGER dev &
    DEV_SERVER_PID=$!

    # Wait for server to start (max 30 seconds)
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null; then
            echo -e "${GREEN}✅ Development server started (PID: $DEV_SERVER_PID)${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done

    if ! curl -s http://localhost:3000 > /dev/null; then
        echo -e "${RED}❌ Failed to start development server${NC}"
        kill $DEV_SERVER_PID 2>/dev/null || true
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}🧪 Running E2E Tests for Login Retry Logic...${NC}"
echo ""

# Run tests with different modes based on argument
case "${1:-}" in
    "--ui")
        echo -e "${BLUE}Running tests in UI mode...${NC}"
        $PKG_MANAGER test:e2e:ui tests/e2e/auth/login-retry.spec.ts
        ;;
    "--headed")
        echo -e "${BLUE}Running tests in headed mode...${NC}"
        $PKG_MANAGER test:e2e:headed tests/e2e/auth/login-retry.spec.ts
        ;;
    "--debug")
        echo -e "${BLUE}Running tests in debug mode...${NC}"
        $PKG_MANAGER test:e2e tests/e2e/auth/login-retry.spec.ts --debug
        ;;
    "--single")
        echo -e "${BLUE}Running single test: ${2}${NC}"
        $PKG_MANAGER test:e2e tests/e2e/auth/login-retry.spec.ts -g "${2}"
        ;;
    *)
        echo -e "${BLUE}Running all tests in headless mode...${NC}"
        $PKG_MANAGER test:e2e tests/e2e/auth/login-retry.spec.ts --reporter=list
        ;;
esac

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✅ All tests passed successfully!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  ❌ Some tests failed${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}📊 Test Results:${NC}"
    echo -e "${YELLOW}  - Check test-results/ directory for detailed reports${NC}"
    echo -e "${YELLOW}  - Screenshots: test-results/screenshots/${NC}"
    echo -e "${YELLOW}  - Videos: test-results/videos/${NC}"
fi

# Cleanup: Kill dev server if we started it
if [ ! -z "${DEV_SERVER_PID:-}" ]; then
    echo ""
    echo -e "${BLUE}🛑 Stopping development server (PID: $DEV_SERVER_PID)...${NC}"
    kill $DEV_SERVER_PID 2>/dev/null || true
fi

echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo -e "  1. Review test results in test-results/ directory"
echo -e "  2. Check screenshots for visual validation"
echo -e "  3. Update BUGS-ANALYSIS.md if bugs found"
echo -e "  4. Commit changes to feature branch"
echo ""

exit $TEST_EXIT_CODE
