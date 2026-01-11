# Deployment Instructions

## Quick Deploy (On Production Server)

```bash
# Copy this script to production server and run:
cd /home/ubuntu/apps/epicages.prod
bash deploy-and-verify.sh
```

## Manual Deploy Steps

### 1. On Production Server

```bash
cd /home/ubuntu/apps/epicages.prod

# Pull latest code (if using git)
git pull origin cursor/production-graphics-gameplay-review-9780

# Or copy files from workspace:
# scp -r user@workspace:/workspace/web/dist/* web/dist/
# scp -r user@workspace:/workspace/server/dist/* server/dist/
# scp user@workspace:/workspace/prod-server.js .

# Rebuild web
cd web
npm install
npm run build
cd ..

# Rebuild server
cd server  
npm install
npm run build
cd ..

# Install root deps
npm install

# Restart PM2
pm2 restart epicages --update-env
```

### 2. Verify Deployment

```bash
# From workspace or production server
./verify-deployment.sh https://epicages.kludgebot.com
```

### 3. If Still Showing Old Build

See `TROUBLESHOOTING-PLAN.md` for detailed steps.

## What Should Change

**Before:**
- Bundle: `index-C5RvPn3-.js`
- No version in HTML
- API returns HTML instead of JSON

**After:**
- Bundle: `index--bfjxHqB.js` (or newer)
- HTML: `window.EPIC_AGES_VERSION = "1.0.0-gameplay-v2"`
- API: `{"version": "1.0.0-gameplay-v2", ...}`
- Enhanced graphics visible
