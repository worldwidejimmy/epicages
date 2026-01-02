# Epic Ages Deployment Notes

This project is split in two halves:

1. **World server** (`server/`) – the authoritative simulation (TypeScript) that steps the civ world, validates intents, and broadcasts snapshots/events over a WebSocket.
2. **Web client** (`web/`) – a Vite/React + PixiJS HUD that renders the world and pushes intents through the same WebSocket.

## Build & package steps

Run these anytime you move the repo to another host:

```bash
# fonts & assets only change when you rebuild
cd /home/ubuntu/apps/epicages.prod/web
npm install
npm run build    # Vite build applies base "/epicages/"

cd ../server
npm install
npm run build   # this emits dist/*.js for the simulation logic

# root package orchestrates the production server
cd ..
npm install   # installs express/ws/dotenv used by prod-server.js
```

## Production server

`prod-server.js` serves static files under `/epicages/`, exposes `/api/health`, and hosts the WebSocket. When you start it via PM2:

```bash
cd /home/ubuntu/apps/epicages.prod
pm run build:web     # optional rebuild after changes
pm2 restart epicages --update-env || \
  pm2 start prod-server.js --name epicages --env PORT=5060
```

Keep an eye on `/home/ubuntu/.pm2/logs/epicages-out.log` for startup messages like `Epic Ages running on http://localhost:5060`.

## WebSocket configuration

The client automatically connects to the same origin it was served from, so when the SPA lives behind `/epicages/` it requests `wss://kludgebot.com/epicages/`. To override this (local dev, alternate hosts, etc.) set `VITE_SERVER_WS`:

```bash
# optional example for dev machines
export VITE_SERVER_WS=wss://myhost.internal/epicages/
npm run dev:web
```

Because the simulation lives server-side, the browser only renders snapshots/events it receives over the socket. The production server must therefore stay alive and have PM2/watchdog supervision if you want `kludgebot.com/epicages` to show the moving world.

## Apache nginx proxy (kludgebot dashboard)

Expose the running service through `kludgebot.com` at `/epicages` (this is the same slot listed in `/home/ubuntu/apps/server-management/PORT-MANAGEMENT.md`). A working Apache snippet looks like this:

```apache
ProxyPreserveHost On
ProxyRequests Off
ProxyPass /epicages/ http://localhost:5060/epicages/
ProxyPassReverse /epicages/ http://localhost:5060/epicages/
ProxyPass /epicages http://localhost:5060/epicages
ProxyPassReverse /epicages http://localhost:5060/epicages
```

Ensure this block appears before the catch-all `ProxyPass / http://localhost:5070/` that serves the kludgebot SPA. If you move hosts, add the same block to the SSL and HTTP vhosts for `kludgebot.com`.

## Kludgebot dashboard integration

- The dashboard adds an internal link under `/epicages` pointing to the proxied path. Update `kludgebot.prod/src/App.jsx` if you rename or change the badge text.
- Keep the dashboard rebuilt (`npm run build`) and restarted via PM2 so the new link and label stay in sync with the hosted slot.

## Recurring maintenance

- When you change `web/src` behave, rebuild Vite (`npm run build`) before reloading PM2 so the updated JS/HTML is served.
- If the static bundle appears stale, purge Cloudflare cache for `https://kludgebot.com/epicages/*` after restarting the server.
- Monitor `pm2 logs epicages` to ensure the WebSocket handshake and tick loop stay alive; the server currently logs when it starts but you can extend it to log proposals/events if you need more visibility.
- The simulation runs a passive `setInterval` every two seconds even when no players are connected, so the PM2 process remains the authoritative owner of the world. Its idle footprint is light (memory stays under ~200MB and CPU usage hovers around 1-2% on the current machines) but keep it running so `kludgebot.com/epicages` can immediately show the latest tick when a browser connects.

By documenting these steps and keeping this file updated, you can rehome Epic Ages to another stack without rediscovering the architecture.
