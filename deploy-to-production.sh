#!/bin/bash
# Deployment script for Epic Ages
# This assumes you're on the production server or have SSH access

set -e

PROD_DIR="${EPICAGES_PROD_DIR:-/home/ubuntu/apps/epicages.prod}"
WORKSPACE_DIR="${WORKSPACE_DIR:-/workspace}"

echo "🚀 Deploying Epic Ages to production"
echo "Production dir: $PROD_DIR"
echo ""

# Check if we're on production server or need to copy files
if [ -d "$PROD_DIR" ]; then
    echo "✅ Production directory found"
    cd "$PROD_DIR"
    
    # Option 1: Git pull (if using git)
    if [ -d ".git" ]; then
        echo "📥 Pulling latest code from git..."
        git pull origin cursor/production-graphics-gameplay-review-9780 || git pull
    fi
    
    # Rebuild web
    echo "🔨 Building web client..."
    cd web
    npm install --silent
    npm run build
    cd ..
    
    # Rebuild server
    echo "🔨 Building server..."
    cd server
    npm install --silent
    npm run build
    cd ..
    
    # Install root dependencies
    echo "📦 Installing root dependencies..."
    npm install --silent
    
    # Restart PM2
    echo "🔄 Restarting PM2..."
    pm2 restart epicages --update-env || pm2 start prod-server.js --name epicages --env PORT=5060
    
    echo ""
    echo "✅ Deployment complete!"
    echo "📋 Check logs: pm2 logs epicages --lines 20"
    
else
    echo "⚠️  Production directory not found at $PROD_DIR"
    echo ""
    echo "To deploy manually:"
    echo "1. Copy files to production server:"
    echo "   scp -r $WORKSPACE_DIR/web/dist/* user@server:$PROD_DIR/web/dist/"
    echo "   scp -r $WORKSPACE_DIR/server/dist/* user@server:$PROD_DIR/server/dist/"
    echo "   scp $WORKSPACE_DIR/prod-server.js user@server:$PROD_DIR/"
    echo ""
    echo "2. On production server:"
    echo "   cd $PROD_DIR"
    echo "   npm install"
    echo "   pm2 restart epicages --update-env"
fi
