# Debugging Version Display Issue

## Problem
Version is not showing on epicages.kludgebot.com - shows "unknown" instead of "1.0.0-gameplay-v2"

## What to Check

### 1. Check Browser Console
Open browser DevTools (F12) → Console tab and look for:
- `[WebSocket] Received snapshot, world version: ...`
- `[Diagnostics] World object: ...`
- `[Diagnostics] World version: ...`

If you see `undefined` or the version is missing, the server isn't sending it.

### 2. Check Server Logs
On production server:
```bash
pm2 logs epicages --lines 50
```

Look for:
- `📦 Version: 1.0.0-gameplay-v2` (should appear on startup)
- Any errors about world.version

### 3. Verify Server Code
On production server (`/home/ubuntu/apps/epicages.prod`):
```bash
cd /home/ubuntu/apps/epicages.prod
grep -n "VERSION" prod-server.js
```

Should see:
```
13:const VERSION = "1.0.0-gameplay-v2";
45:world.version = VERSION;
73:world.version = VERSION;
80:world.version = VERSION;
101:world.version = VERSION;
```

### 4. Verify Web Build
On production server:
```bash
cd /home/ubuntu/apps/epicages.prod/web
ls -lh dist/assets/index-*.js
```

Check the timestamp - should be recent (after graphics changes).

### 5. Test WebSocket Directly
In browser console:
```javascript
const ws = new WebSocket('wss://epicages.kludgebot.com/');
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'snapshot') {
    console.log('Version from server:', msg.world?.version);
  }
};
```

### 6. Common Issues

**Issue: Version shows "unknown"**
- Server not sending version in world object
- Server needs restart: `pm2 restart epicages`
- Server code might be old (check step 3)

**Issue: Graphics not updated**
- Web build not deployed: `cd web && npm run build`
- PM2 not restarted after build
- Cloudflare cache (already purged)

**Issue: WebSocket not connecting**
- Check server is running: `pm2 status`
- Check port 5060 is accessible
- Check Apache WebSocket proxy config

## Quick Fix

If version is missing, restart everything:
```bash
cd /home/ubuntu/apps/epicages.prod
cd web && npm run build
cd ..
pm2 restart epicages --update-env
```

Then check browser console for the debug logs.
