#!/bin/bash
# Complete deployment and verification script
# Run this on the production server

set -e

PROD_DIR="/home/ubuntu/apps/epicages.prod"
HOST="https://epicages.kludgebot.com"

echo "🚀 Epic Ages Deployment & Verification"
echo "========================================"
echo ""

# Step 1: Deploy
echo "📦 Step 1: Deploying..."
cd "$PROD_DIR" || { echo "❌ Production dir not found: $PROD_DIR"; exit 1; }

# Rebuild web
echo "  🔨 Building web client..."
cd web
npm install --silent > /dev/null 2>&1
npm run build
cd ..

# Rebuild server  
echo "  🔨 Building server..."
cd server
npm install --silent > /dev/null 2>&1
npm run build
cd ..

# Install root deps
echo "  📦 Installing dependencies..."
npm install --silent > /dev/null 2>&1

# Restart PM2
echo "  🔄 Restarting PM2..."
pm2 restart epicages --update-env > /dev/null 2>&1 || pm2 start prod-server.js --name epicages --env PORT=5060

echo "  ⏳ Waiting for server to start..."
sleep 3

echo ""
echo "✅ Deployment complete!"
echo ""

# Step 2: Verify
echo "🔍 Step 2: Verifying deployment..."
echo ""

# Check local server first
echo "  Testing local server..."
LOCAL_VERSION=$(curl -s http://localhost:5060/api/version 2>/dev/null | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "failed")
if [ "$LOCAL_VERSION" = "1.0.0-gameplay-v2" ]; then
    echo "  ✅ Local API version: $LOCAL_VERSION"
else
    echo "  ⚠️  Local API version check: $LOCAL_VERSION"
fi

# Check HTML version locally
LOCAL_HTML_VER=$(curl -s http://localhost:5060/ 2>/dev/null | grep -o 'window.EPIC_AGES_VERSION = "[^"]*"' | cut -d'"' -f2 || echo "not-found")
if [ "$LOCAL_HTML_VER" = "1.0.0-gameplay-v2" ]; then
    echo "  ✅ Local HTML version: $LOCAL_HTML_VER"
else
    echo "  ⚠️  Local HTML version: $LOCAL_HTML_VER"
fi

# Check bundle
LOCAL_BUNDLE=$(curl -s http://localhost:5060/ 2>/dev/null | grep -o 'src="/assets/index-[^"]*\.js"' | cut -d'"' -f2 | cut -d'/' -f3 || echo "not-found")
echo "  📦 Local bundle: $LOCAL_BUNDLE"

echo ""
echo "  Testing public server..."
sleep 2

# Run full verification
cd /workspace 2>/dev/null || cd "$(dirname "$0")"
if [ -f "./verify-deployment.sh" ]; then
    ./verify-deployment.sh "$HOST"
else
    echo "  ⚠️  Verification script not found, running basic checks..."
    
    # Basic checks
    PUBLIC_VERSION=$(curl -s "$HOST/api/version" 2>/dev/null | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "failed")
    PUBLIC_HTML_VER=$(curl -s "$HOST/" 2>/dev/null | grep -o 'window.EPIC_AGES_VERSION = "[^"]*"' | cut -d'"' -f2 || echo "not-found")
    PUBLIC_BUNDLE=$(curl -s "$HOST/" 2>/dev/null | grep -o 'src="/assets/index-[^"]*\.js"' | cut -d'"' -f2 | cut -d'/' -f3 || echo "not-found")
    
    echo ""
    echo "  📊 Public Server Results:"
    echo "    API Version: $PUBLIC_VERSION"
    echo "    HTML Version: $PUBLIC_HTML_VER"
    echo "    Bundle: $PUBLIC_BUNDLE"
    
    if [ "$PUBLIC_VERSION" = "1.0.0-gameplay-v2" ] && [ "$PUBLIC_HTML_VER" = "1.0.0-gameplay-v2" ]; then
        echo ""
        echo "  ✅ All checks passed!"
    else
        echo ""
        echo "  ⚠️  Some checks failed - see troubleshooting plan"
    fi
fi

echo ""
echo "📋 Next steps:"
echo "  - Check PM2 logs: pm2 logs epicages --lines 20"
echo "  - Clear Cloudflare cache if needed"
echo "  - Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
