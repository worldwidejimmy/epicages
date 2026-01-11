# Deploy New Build to Production

## Current Issue
Production is serving OLD build: `index-C5RvPn3-.js`
New build has: `index--bfjxHqB.js` (with graphics improvements + debug logging)

## Steps to Deploy

### On Production Server (`/home/ubuntu/apps/epicages.prod`):

```bash
# 1. Navigate to production directory
cd /home/ubuntu/apps/epicages.prod

# 2. Pull latest code (or copy from workspace)
git pull origin cursor/production-graphics-gameplay-review-9780
# OR if not using git, copy the built files:
# scp -r /workspace/web/dist/* user@server:/home/ubuntu/apps/epicages.prod/web/dist/

# 3. Rebuild web client
cd web
npm install  # if needed
npm run build

# 4. Verify new build exists
ls -lh dist/assets/index-*.js
# Should see: index--bfjxHqB.js (or similar new hash)

# 5. Restart PM2 server
cd ..
pm2 restart epicages --update-env

# 6. Check logs to confirm version
pm2 logs epicages --lines 10
# Should see: 📦 Version: 1.0.0-gameplay-v2
```

### After Deploy, Check Browser:

1. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. Open DevTools Console (F12)
3. Look for:
   - New bundle: `index--bfjxHqB.js` (or new hash)
   - Debug logs: `[WebSocket] Received snapshot, world version: ...`
   - `[Diagnostics] World version: ...`
4. Check "Live diagnostics" section - Version should show `1.0.0-gameplay-v2`

### If Still Seeing Old Build:

1. **Cloudflare cache** - You already purged, but try:
   - Cloudflare Dashboard → Caching → Purge Everything
   - Or use API to purge specific URL

2. **Browser cache** - Hard refresh or clear cache:
   - Chrome: Ctrl+Shift+Delete → Clear cached images and files
   - Or use Incognito/Private window

3. **Check PM2 is serving new files**:
   ```bash
   pm2 logs epicages
   # Check the file paths in logs
   ```

4. **Verify file timestamps**:
   ```bash
   ls -lh /home/ubuntu/apps/epicages.prod/web/dist/assets/index-*.js
   # Should show recent timestamp (after your build)
   ```

## What Changed in New Build:

✅ Enhanced graphics (structures, animations, effects)
✅ Era-specific color themes
✅ Visual production indicators (smoke, glow)
✅ Better population sprites
✅ Debug logging for version tracking
✅ Version display in diagnostics panel
