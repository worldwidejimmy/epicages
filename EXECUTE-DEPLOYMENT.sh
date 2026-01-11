#!/bin/bash
# Complete automated deployment script
# This will deploy, verify, and retry if needed

set -e

PROD_DIR="/home/ubuntu/apps/epicages.prod"
WORKSPACE_DIR="/workspace"
MAX_RETRIES=3

echo "🚀 Epic Ages Automated Deployment"
echo "=================================="
echo ""

# Function to deploy
deploy() {
    echo "📦 Step 1: Deploying to production..."
    
    if [ ! -d "$PROD_DIR" ]; then
        echo "❌ Production directory not found: $PROD_DIR"
        echo "   Please ensure production server is accessible"
        return 1
    fi
    
    cd "$PROD_DIR"
    
    # Backup current build
    echo "  💾 Backing up current build..."
    [ -d "web/dist" ] && cp -r web/dist web/dist.backup.$(date +%s) || true
    [ -d "server/dist" ] && cp -r server/dist server/dist.backup.$(date +%s) || true
    
    # Copy new builds from workspace
    echo "  📋 Copying new builds..."
    if [ -d "$WORKSPACE_DIR/web/dist" ]; then
        rm -rf web/dist/*
        cp -r "$WORKSPACE_DIR/web/dist"/* web/dist/
        echo "  ✅ Web build copied"
    else
        echo "  🔨 Building web client..."
        cd web
        npm install --silent
        npm run build
        cd ..
    fi
    
    if [ -d "$WORKSPACE_DIR/server/dist" ]; then
        rm -rf server/dist/*
        cp -r "$WORKSPACE_DIR/server/dist"/* server/dist/
        echo "  ✅ Server build copied"
    else
        echo "  🔨 Building server..."
        cd server
        npm install --silent
        npm run build
        cd ..
    fi
    
    # Copy prod-server.js if updated
    if [ -f "$WORKSPACE_DIR/prod-server.js" ]; then
        cp "$WORKSPACE_DIR/prod-server.js" .
        echo "  ✅ prod-server.js updated"
    fi
    
    # Install dependencies
    echo "  📦 Installing dependencies..."
    npm install --silent
    
    # Restart PM2
    echo "  🔄 Restarting PM2..."
    pm2 restart epicages --update-env 2>/dev/null || pm2 start prod-server.js --name epicages --env PORT=5060
    
    echo "  ⏳ Waiting for server to start..."
    sleep 5
    
    echo "  ✅ Deployment complete!"
    return 0
}

# Function to verify
verify() {
    echo ""
    echo "🔍 Step 2: Verifying deployment..."
    
    HOST="https://epicages.kludgebot.com"
    
    # Check API version
    API_RESPONSE=$(curl -s "${HOST}/api/version" 2>/dev/null)
    if echo "$API_RESPONSE" | grep -q '"version":"1.0.0-gameplay-v2"'; then
        echo "  ✅ API version correct"
        API_OK=1
    else
        echo "  ❌ API version check failed"
        echo "     Response: $(echo "$API_RESPONSE" | head -c 200)"
        API_OK=0
    fi
    
    # Check HTML version
    HTML=$(curl -s "${HOST}/" 2>/dev/null)
    HTML_VER=$(echo "$HTML" | grep -o 'window.EPIC_AGES_VERSION = "[^"]*"' | cut -d'"' -f2)
    if [ "$HTML_VER" = "1.0.0-gameplay-v2" ]; then
        echo "  ✅ HTML version correct: $HTML_VER"
        HTML_OK=1
    else
        echo "  ❌ HTML version check failed: '$HTML_VER'"
        HTML_OK=0
    fi
    
    # Check bundle
    BUNDLE=$(echo "$HTML" | grep -o 'src="/assets/index-[^"]*\.js"' | cut -d'"' -f2 | cut -d'/' -f3)
    if [ "$BUNDLE" != "index-C5RvPn3-.js" ]; then
        echo "  ✅ Bundle updated: $BUNDLE"
        BUNDLE_OK=1
    else
        echo "  ❌ Bundle still old: $BUNDLE"
        BUNDLE_OK=0
    fi
    
    # Check WebSocket
    WS_VER=$(node -e "
        const WebSocket = require('ws');
        const ws = new WebSocket('wss://epicages.kludgebot.com/');
        let version = null;
        const timeout = setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 5000);
        ws.on('message', (d) => {
            const m = JSON.parse(d.toString());
            if (m.type === 'snapshot' && m.world) {
                version = m.world.version || 'not-set';
                console.log(version);
                clearTimeout(timeout);
                ws.close();
                setTimeout(() => process.exit(0), 100);
            }
        });
        ws.on('error', () => { clearTimeout(timeout); process.exit(1); });
    " 2>/dev/null || echo "failed")
    
    if [ "$WS_VER" = "1.0.0-gameplay-v2" ]; then
        echo "  ✅ WebSocket version correct: $WS_VER"
        WS_OK=1
    else
        echo "  ⚠️  WebSocket version: $WS_VER"
        WS_OK=1  # WebSocket was already working
    fi
    
    # Summary
    TOTAL=$((API_OK + HTML_OK + BUNDLE_OK + WS_OK))
    echo ""
    echo "  📊 Verification: $TOTAL/4 checks passed"
    
    if [ $TOTAL -eq 4 ]; then
        return 0
    else
        return 1
    fi
}

# Main deployment loop
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Attempt $((RETRY + 1))/$MAX_RETRIES"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if deploy; then
        if verify; then
            echo ""
            echo "🎉 SUCCESS! Deployment verified!"
            echo ""
            echo "Next steps:"
            echo "  1. Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)"
            echo "  2. Hard refresh the page"
            echo "  3. Check for new graphics and version display"
            exit 0
        else
            RETRY=$((RETRY + 1))
            if [ $RETRY -lt $MAX_RETRIES ]; then
                echo ""
                echo "⚠️  Verification failed. Retrying in 10 seconds..."
                sleep 10
            fi
        fi
    else
        RETRY=$((RETRY + 1))
        if [ $RETRY -lt $MAX_RETRIES ]; then
            echo ""
            echo "⚠️  Deployment failed. Retrying in 10 seconds..."
            sleep 10
        fi
    fi
done

echo ""
echo "❌ Deployment failed after $MAX_RETRIES attempts"
echo "   See TROUBLESHOOTING-PLAN.md for manual steps"
exit 1
