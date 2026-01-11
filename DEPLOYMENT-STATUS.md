# Deployment Status & Action Plan

## Current Status (As of Check)

❌ **Production is serving OLD build**

### Current Production State:
- ✅ WebSocket: Sending version `1.0.0-gameplay-v2` (server code updated)
- ❌ HTML: Missing version injection (old build)
- ❌ JavaScript Bundle: `index-C5RvPn3-.js` (old, should be `index--bfjxHqB.js`)
- ❌ API Endpoint: `/api/version` returns HTML instead of JSON (routing issue)

### Verification Results:
- ✅ Passed: 3 checks (health, WebSocket version)
- ❌ Failed: 3 checks (API version, HTML version, bundle check)

## What's Ready to Deploy

✅ **All builds complete in `/workspace/`:**
- Web build: `web/dist/index--bfjxHqB.js` (428KB, with new graphics)
- Server build: `server/dist/` (9 files)
- Version injection: Configured in `vite.config.ts`
- API endpoint: Added to `prod-server.js`

## Deployment Steps

### Option 1: Automated (Recommended)

On production server, run:
```bash
cd /home/ubuntu/apps/epicages.prod
bash deploy-and-verify.sh
```

### Option 2: Manual

```bash
cd /home/ubuntu/apps/epicages.prod

# If using git:
git pull origin cursor/production-graphics-gameplay-review-9780

# Rebuild
cd web && npm install && npm run build && cd ..
cd server && npm install && npm run build && cd ..
npm install

# Restart
pm2 restart epicages --update-env
```

### Option 3: Copy Files

If workspace and production are separate:
```bash
# From workspace, copy to production server
scp -r /workspace/web/dist/* user@server:/home/ubuntu/apps/epicages.prod/web/dist/
scp -r /workspace/server/dist/* user@server:/home/ubuntu/apps/epicages.prod/server/dist/
scp /workspace/prod-server.js user@server:/home/ubuntu/apps/epicages.prod/

# Then on production server:
cd /home/ubuntu/apps/epicages.prod
npm install
pm2 restart epicages --update-env
```

## Verification After Deploy

Run from workspace or production server:
```bash
./verify-deployment.sh https://epicages.kludgebot.com
```

**Expected Results:**
- ✅ All 7 checks should pass
- ✅ Bundle: `index--bfjxHqB.js` (or newer hash)
- ✅ HTML: `window.EPIC_AGES_VERSION = "1.0.0-gameplay-v2"`
- ✅ API: `{"version": "1.0.0-gameplay-v2", ...}`

## If Still Showing Old Build

See `TROUBLESHOOTING-PLAN.md` for:
1. Force PM2 restart
2. Clear Apache/nginx cache
3. Verify file permissions
4. Check for multiple instances
5. Nuclear option: Full redeploy

## Quick Diagnostic Commands

```bash
# Check what's actually deployed
curl https://epicages.kludgebot.com/api/version
curl https://epicages.kludgebot.com/ | grep "EPIC_AGES_VERSION"
curl https://epicages.kludgebot.com/ | grep "index-.*\.js"

# Check PM2 status
pm2 logs epicages --lines 20
pm2 list
```

## Files Created

- ✅ `verify-deployment.sh` - Automated verification script
- ✅ `deploy-and-verify.sh` - Complete deployment + verification
- ✅ `deploy-to-production.sh` - Deployment script
- ✅ `TROUBLESHOOTING-PLAN.md` - Detailed troubleshooting steps
- ✅ `DEPLOYMENT-INSTRUCTIONS.md` - Step-by-step guide

## Next Actions

1. **Deploy** using one of the options above
2. **Verify** using `./verify-deployment.sh https://epicages.kludgebot.com`
3. **Clear browser cache** (Cmd+Shift+R or Ctrl+Shift+R)
4. **Check Cloudflare cache** if still showing old files
