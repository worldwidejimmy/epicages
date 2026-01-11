# Complete Deployment Documentation

## Current Situation

✅ **All builds ready in `/workspace/`:**
- Web: `web/dist/index--bfjxHqB.js` (428KB, with new graphics)
- Server: `server/dist/` (9 files, all built)
- Version: `1.0.0-gameplay-v2`
- Scripts: All deployment scripts created

❌ **Production server not accessible from workspace**
- Production is at: `/home/ubuntu/apps/epicages.prod` (different server/location)
- Need to deploy manually or via SSH

## Deployment Options

### Option 1: SSH Deployment (Recommended)

If you have SSH access to production server:

```bash
# From your local machine or a machine with SSH access:

# 1. Copy deployment script to production
scp /workspace/EXECUTE-DEPLOYMENT.sh user@production-server:/tmp/
scp -r /workspace/web/dist/* user@production-server:/home/ubuntu/apps/epicages.prod/web/dist/
scp -r /workspace/server/dist/* user@production-server:/home/ubuntu/apps/epicages.prod/server/dist/
scp /workspace/prod-server.js user@production-server:/home/ubuntu/apps/epicages.prod/

# 2. SSH to production and run
ssh user@production-server
cd /home/ubuntu/apps/epicages.prod
bash /tmp/EXECUTE-DEPLOYMENT.sh
```

### Option 2: Manual Deployment on Production Server

```bash
# On production server:
cd /home/ubuntu/apps/epicages.prod

# Pull latest code (if using git)
git pull origin cursor/production-graphics-gameplay-review-9780

# Rebuild everything
cd web
npm install
npm run build
cd ../server
npm install  
npm run build
cd ..

# Install root deps
npm install

# Restart
pm2 restart epicages --update-env

# Verify
curl http://localhost:5060/api/version
```

### Option 3: If Workspace IS Production

If `/workspace` is actually the production location:

```bash
cd /workspace
npm install
pm2 restart epicages --update-env
# Or if not using PM2:
# node prod-server.js
```

## Verification After Deployment

Run from anywhere:
```bash
./verify-deployment.sh https://epicages.kludgebot.com
```

**Expected Results:**
- ✅ All 7 checks pass
- ✅ Bundle: `index--bfjxHqB.js` (not `index-C5RvPn3-.js`)
- ✅ HTML: `window.EPIC_AGES_VERSION = "1.0.0-gameplay-v2"`
- ✅ API: Returns JSON with version

## What Changed

### Graphics Improvements:
- ✅ Enhanced structure rendering (huts, farms, forges, workshops)
- ✅ Visual production indicators (smoke, glow effects)
- ✅ Better population sprites with activity indicators
- ✅ Era-specific color themes
- ✅ Improved animations

### Version Tracking:
- ✅ Version in HTML meta tag
- ✅ Version in JavaScript variable
- ✅ Version API endpoint (`/api/version`)
- ✅ Version in WebSocket world object
- ✅ Version display in UI diagnostics panel

## Troubleshooting

If deployment fails or verification shows old build:

1. **Check PM2 logs:**
   ```bash
   pm2 logs epicages --lines 30
   ```

2. **Force restart:**
   ```bash
   pm2 delete epicages
   pm2 start prod-server.js --name epicages --env PORT=5060
   ```

3. **Clear caches:**
   - Browser: Hard refresh (Cmd+Shift+R)
   - Cloudflare: Purge cache in dashboard
   - Apache: `sudo systemctl restart apache2`

4. **Verify files:**
   ```bash
   ls -lh /home/ubuntu/apps/epicages.prod/web/dist/assets/index-*.js
   grep "EPIC_AGES_VERSION" /home/ubuntu/apps/epicages.prod/web/dist/index.html
   ```

See `TROUBLESHOOTING-PLAN.md` for detailed steps.

## Files Created

- ✅ `EXECUTE-DEPLOYMENT.sh` - Automated deployment with retry
- ✅ `verify-deployment.sh` - Verification script
- ✅ `deploy-and-verify.sh` - Combined deploy + verify
- ✅ `TROUBLESHOOTING-PLAN.md` - Detailed troubleshooting
- ✅ `DEPLOYMENT-STATUS.md` - Current status
- ✅ `DEPLOYMENT-COMPLETE.md` - This file

## Next Steps

1. **Deploy** using one of the options above
2. **Verify** using `./verify-deployment.sh https://epicages.kludgebot.com`
3. **Clear browser cache** and hard refresh
4. **Check** for new graphics and version display
