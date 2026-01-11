# Troubleshooting Plan - If Still Serving Old Build

## Step 1: Verify Deployment Files

```bash
# On production server
cd /home/ubuntu/apps/epicages.prod

# Check web build
ls -lh web/dist/assets/index-*.js
# Should see: index--bfjxHqB.js (or newer hash)

# Check HTML has version
grep "EPIC_AGES_VERSION" web/dist/index.html
# Should see: window.EPIC_AGES_VERSION = "1.0.0-gameplay-v2"

# Check server build
ls -lh server/dist/sim.js
# Should exist and be recent
```

## Step 2: Force PM2 Restart

```bash
# Stop completely
pm2 stop epicages
pm2 delete epicages

# Clear PM2 cache
pm2 flush

# Start fresh
cd /home/ubuntu/apps/epicages.prod
pm2 start prod-server.js --name epicages --env PORT=5060

# Check logs
pm2 logs epicages --lines 30
# Should see: 📦 Version: 1.0.0-gameplay-v2
```

## Step 3: Verify File Permissions

```bash
# Ensure files are readable
chmod -R 755 /home/ubuntu/apps/epicages.prod/web/dist
chmod -R 755 /home/ubuntu/apps/epicages.prod/server/dist
```

## Step 4: Check Apache/Proxy Cache

```bash
# Restart Apache to clear any proxy cache
sudo systemctl restart apache2

# Or if using nginx
sudo systemctl restart nginx
```

## Step 5: Verify Server is Serving Correct Files

```bash
# Test locally on server
curl http://localhost:5060/api/version
# Should return JSON with version

curl http://localhost:5060/ | grep "EPIC_AGES_VERSION"
# Should show version string
```

## Step 6: Clear All Caches

### Cloudflare
- Dashboard → Caching → Purge Everything
- Or purge specific URL: `https://epicages.kludgebot.com/*`

### Browser
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Or clear cache: Settings → Clear browsing data → Cached images and files

### Server-side
```bash
# If using any reverse proxy cache
sudo systemctl restart apache2
# Or check for varnish/other cache services
```

## Step 7: Nuclear Option - Full Redeploy

```bash
cd /home/ubuntu/apps/epicages.prod

# Backup current
cp -r web/dist web/dist.backup
cp -r server/dist server/dist.backup

# Fresh build
cd web
rm -rf dist node_modules
npm install
npm run build

cd ../server
rm -rf dist node_modules
npm install
npm run build

cd ..
npm install

# Restart
pm2 delete epicages
pm2 start prod-server.js --name epicages --env PORT=5060
```

## Step 8: Check for Multiple Instances

```bash
# Check if multiple Node processes running
ps aux | grep "node.*prod-server"

# Check PM2 list
pm2 list

# Kill any stray processes
pkill -f "prod-server.js"
pm2 restart all
```

## Step 9: Verify WebSocket vs HTTP

The WebSocket might be updated but HTTP serving old files:

```bash
# Check WebSocket (should work)
node -e "const ws = require('ws'); const w = new ws('wss://epicages.kludgebot.com/'); w.on('message', d => { const m = JSON.parse(d); if(m.type==='snapshot') { console.log('WS Version:', m.world?.version); process.exit(0); } });"

# Check HTTP (might be old)
curl https://epicages.kludgebot.com/ | grep "index-.*\.js"
```

## Step 10: Check File Timestamps

```bash
# All files should be recent (after your build)
find /home/ubuntu/apps/epicages.prod/web/dist -type f -exec ls -lh {} \; | head -10
find /home/ubuntu/apps/epicages.prod/server/dist -type f -exec ls -lh {} \; | head -10
```

## Diagnostic Commands

```bash
# Full diagnostic
cd /home/ubuntu/apps/epicages.prod
echo "=== Web Build ==="
ls -lh web/dist/assets/index-*.js
echo ""
echo "=== HTML Version ==="
grep "EPIC_AGES_VERSION" web/dist/index.html | head -1
echo ""
echo "=== Server Version ==="
grep "VERSION = " prod-server.js
echo ""
echo "=== PM2 Status ==="
pm2 list
echo ""
echo "=== PM2 Logs (last 10 lines) ==="
pm2 logs epicages --lines 10 --nostream
```

## Expected Results After Fix

✅ `/api/version` returns JSON with `"version": "1.0.0-gameplay-v2"`  
✅ HTML contains `window.EPIC_AGES_VERSION = "1.0.0-gameplay-v2"`  
✅ JavaScript bundle is `index--bfjxHqB.js` (or newer)  
✅ WebSocket sends `world.version: "1.0.0-gameplay-v2"`  
✅ Verification script passes all checks
