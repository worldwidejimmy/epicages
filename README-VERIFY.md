# Deployment Verification

## Quick Verification

Use the verification script to check if deployment is correct:

```bash
# Local
./verify-deployment.sh http://localhost:5060

# Production
./verify-deployment.sh https://epicages.kludgebot.com
```

## What It Checks

1. **Health Endpoint** (`/api/health`)
   - Server is running and responding

2. **Version API** (`/api/version`)
   - Server version: `1.0.0-gameplay-v2`
   - World version (from WebSocket data)
   - Build time

3. **HTML Version**
   - Meta tag: `<meta name="epic-ages-version" content="...">`
   - Script variable: `window.EPIC_AGES_VERSION`
   - JavaScript bundle filename

4. **WebSocket Version**
   - Connects to WebSocket
   - Receives snapshot message
   - Checks `world.version` field

## Manual Verification

### Check API Version
```bash
curl https://epicages.kludgebot.com/api/version | jq
```

Expected:
```json
{
  "version": "1.0.0-gameplay-v2",
  "buildTime": "2026-01-11T...",
  "serverVersion": "1.0.0-gameplay-v2",
  "worldVersion": "1.0.0-gameplay-v2"
}
```

### Check HTML Version
```bash
curl https://epicages.kludgebot.com/ | grep -o 'window.EPIC_AGES_VERSION = "[^"]*"'
```

Expected:
```
window.EPIC_AGES_VERSION = "1.0.0-gameplay-v2"
```

### Check WebSocket (Node.js)
```bash
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('wss://epicages.kludgebot.com/');
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === 'snapshot') {
    console.log('Version:', msg.world?.version);
    process.exit(0);
  }
});
"
```

## Expected Results

✅ **All checks should show**: `1.0.0-gameplay-v2`

If you see:
- `unknown` or `not-set` → Server not sending version
- Old version → Old code deployed
- `BUILD_VERSION_PLACEHOLDER` → Build didn't inject version

## Troubleshooting

**Version shows "unknown" in UI:**
1. Check server logs: `pm2 logs epicages`
2. Verify `/api/version` returns correct version
3. Check WebSocket is sending `world.version`

**HTML shows placeholder:**
1. Rebuild web: `cd web && npm run build`
2. Check `web/dist/index.html` has real version
3. Restart PM2: `pm2 restart epicages`

**WebSocket version missing:**
1. Check `prod-server.js` sets `world.version = VERSION`
2. Verify server restarted after code changes
3. Check server logs for errors
