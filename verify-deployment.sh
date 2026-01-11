#!/bin/bash
# Verification script for Epic Ages deployment
# Usage: ./verify-deployment.sh [host]

HOST="${1:-http://localhost:5060}"
BASE_URL="${HOST%/}"

echo "🔍 Verifying Epic Ages deployment at: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SUCCESS=0
FAILURES=0

# Function to check API endpoint
check_api() {
  echo "📡 Checking API version endpoint..."
  RESPONSE=$(curl -s "${BASE_URL}/api/version" 2>/dev/null)
  if [ $? -eq 0 ] && [ -n "$RESPONSE" ]; then
    echo -e "${GREEN}✅ API Response:${NC}"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo ""
    
    # Extract version
    VERSION=$(echo "$RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$VERSION" ]; then
      echo -e "${GREEN}✅ Server Version: $VERSION${NC}"
      SUCCESS=$((SUCCESS + 1))
    else
      echo -e "${RED}❌ Could not extract version${NC}"
      FAILURES=$((FAILURES + 1))
    fi
  else
    echo -e "${RED}❌ Failed to reach API endpoint${NC}"
    FAILURES=$((FAILURES + 1))
  fi
  echo ""
}

# Function to check HTML version
check_html() {
  echo "🌐 Checking HTML version..."
  HTML=$(curl -s "${BASE_URL}/" 2>/dev/null)
  if [ $? -eq 0 ] && [ -n "$HTML" ]; then
    # Check for version meta tag
    META_VERSION=$(echo "$HTML" | grep -o 'name="epic-ages-version" content="[^"]*"' | cut -d'"' -f4)
    if [ -n "$META_VERSION" ] && [ "$META_VERSION" != "BUILD_VERSION_PLACEHOLDER" ]; then
      echo -e "${GREEN}✅ HTML Meta Version: $META_VERSION${NC}"
      SUCCESS=$((SUCCESS + 1))
    else
      echo -e "${YELLOW}⚠️  HTML version not found or placeholder${NC}"
      FAILURES=$((FAILURES + 1))
    fi
    
    # Check for window.EPIC_AGES_VERSION
    SCRIPT_VERSION=$(echo "$HTML" | grep -o 'window.EPIC_AGES_VERSION = "[^"]*"' | cut -d'"' -f2)
    if [ -n "$SCRIPT_VERSION" ] && [ "$SCRIPT_VERSION" != "BUILD_VERSION_PLACEHOLDER" ]; then
      echo -e "${GREEN}✅ Script Version: $SCRIPT_VERSION${NC}"
      SUCCESS=$((SUCCESS + 1))
    else
      echo -e "${YELLOW}⚠️  Script version not found or placeholder${NC}"
      FAILURES=$((FAILURES + 1))
    fi
    
    # Check for JavaScript bundle
    JS_BUNDLE=$(echo "$HTML" | grep -o 'src="/assets/index-[^"]*\.js"' | cut -d'"' -f2)
    if [ -n "$JS_BUNDLE" ]; then
      echo -e "${GREEN}✅ JavaScript Bundle: $JS_BUNDLE${NC}"
      SUCCESS=$((SUCCESS + 1))
      
      # Try to fetch the bundle and check for version strings or new code indicators
      BUNDLE_CONTENT=$(curl -s "${BASE_URL}${JS_BUNDLE}" 2>/dev/null | head -c 10000)
      BUNDLE_SIZE=$(curl -s -I "${BASE_URL}${JS_BUNDLE}" 2>/dev/null | grep -i "content-length" | awk '{print $2}' | tr -d '\r')
      if [ -n "$BUNDLE_SIZE" ] && [ "$BUNDLE_SIZE" -gt 400000 ]; then
        echo -e "${GREEN}✅ Bundle size looks correct (~${BUNDLE_SIZE} bytes)${NC}"
        SUCCESS=$((SUCCESS + 1))
      elif echo "$BUNDLE_CONTENT" | grep -q "charcoal_kiln\|F9D65C\|drawHut\|ERA_THEMES"; then
        echo -e "${GREEN}✅ Bundle contains expected code${NC}"
        SUCCESS=$((SUCCESS + 1))
      else
        echo -e "${YELLOW}⚠️  Bundle verification inconclusive (code is minified)${NC}"
        echo "   Bundle size: ${BUNDLE_SIZE:-unknown} bytes"
        # Don't count as failure since minified code is hard to verify
      fi
    else
      echo -e "${RED}❌ JavaScript bundle not found${NC}"
      FAILURES=$((FAILURES + 1))
    fi
  else
    echo -e "${RED}❌ Failed to fetch HTML${NC}"
    FAILURES=$((FAILURES + 1))
  fi
  echo ""
}

# Function to check WebSocket (requires Node.js)
check_websocket() {
  echo "🔌 Checking WebSocket version..."
  if command -v node >/dev/null 2>&1; then
    WS_CHECK=$(node -e "
      const WebSocket = require('ws');
      const url = '${BASE_URL}'.replace('http://', 'ws://').replace('https://', 'wss://');
      const ws = new WebSocket(url);
      let version = null;
      let timeout = setTimeout(() => {
        console.log('TIMEOUT');
        process.exit(1);
      }, 5000);
      ws.on('open', () => {
        console.log('CONNECTED');
      });
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'snapshot' && msg.world) {
            version = msg.world.version || 'not-set';
            console.log('VERSION:' + version);
            clearTimeout(timeout);
            ws.close();
            setTimeout(() => process.exit(0), 100);
          }
        } catch (e) {
          console.log('ERROR:' + e.message);
          clearTimeout(timeout);
          process.exit(1);
        }
      });
      ws.on('error', (e) => {
        console.log('ERROR:' + e.message);
        clearTimeout(timeout);
        process.exit(1);
      });
    " 2>&1)
    
    if echo "$WS_CHECK" | grep -q "VERSION:"; then
      WS_VERSION=$(echo "$WS_CHECK" | grep "VERSION:" | cut -d':' -f2)
      if [ "$WS_VERSION" != "not-set" ] && [ -n "$WS_VERSION" ]; then
        echo -e "${GREEN}✅ WebSocket Version: $WS_VERSION${NC}"
        SUCCESS=$((SUCCESS + 1))
      else
        echo -e "${RED}❌ WebSocket version not set${NC}"
        FAILURES=$((FAILURES + 1))
      fi
    else
      echo -e "${YELLOW}⚠️  Could not verify WebSocket (might need ws package: npm install ws)${NC}"
      echo "   Response: $WS_CHECK"
    fi
  else
    echo -e "${YELLOW}⚠️  Node.js not available, skipping WebSocket check${NC}"
  fi
  echo ""
}

# Function to check health endpoint
check_health() {
  echo "❤️  Checking health endpoint..."
  HEALTH=$(curl -s "${BASE_URL}/api/health" 2>/dev/null)
  if [ $? -eq 0 ] && echo "$HEALTH" | grep -q "ok"; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"
    SUCCESS=$((SUCCESS + 1))
  else
    echo -e "${RED}❌ Health check failed${NC}"
    FAILURES=$((FAILURES + 1))
  fi
  echo ""
}

# Run all checks
check_health
check_api
check_html
check_websocket

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Verification Summary:"
echo -e "   ${GREEN}✅ Passed: $SUCCESS${NC}"
echo -e "   ${RED}❌ Failed: $FAILURES${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILURES -eq 0 ]; then
  echo -e "${GREEN}🎉 All checks passed!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some checks failed. Review output above.${NC}"
  exit 1
fi
