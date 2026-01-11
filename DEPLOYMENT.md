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
npm run build    # Vite build uses base "/" (subdomain deployment)

cd ../server
npm install
npm run build   # this emits dist/*.js for the simulation logic

# root package orchestrates the production server
cd ..
npm install   # installs express/ws/dotenv used by prod-server.js
```

## Production server

`prod-server.js` serves static files from root (`/`), exposes `/api/health`, and hosts the WebSocket. When you start it via PM2:

```bash
cd /home/ubuntu/apps/epicages.prod
pm run build:web     # optional rebuild after changes
pm2 restart epicages --update-env || \
  pm2 start prod-server.js --name epicages --env PORT=5060
```

Keep an eye on `/home/ubuntu/.pm2/logs/epicages-out.log` for startup messages like `Epic Ages running on http://localhost:5060`.

## WebSocket configuration

The client automatically connects to the same origin it was served from, so when the SPA lives on `epicages.kludgebot.com` it requests `wss://epicages.kludgebot.com/`. To override this (local dev, alternate hosts, etc.) set `VITE_SERVER_WS`:

```bash
# optional example for dev machines
export VITE_SERVER_WS=wss://myhost.internal/
npm run dev:web
```

Because the simulation lives server-side, the browser only renders snapshots/events it receives over the socket. The production server must therefore stay alive and have PM2/watchdog supervision if you want `epicages.kludgebot.com` to show the moving world.

## Apache virtual host (subdomain deployment)

Epic Ages is deployed on the subdomain `epicages.kludgebot.com` (port 5060). The Apache configuration includes:

1. **HTTP virtual host** (`/etc/apache2/sites-available/epicages.kludgebot.com.conf`):
   - Redirects HTTP to HTTPS

2. **HTTPS virtual host** (`/etc/apache2/sites-available/epicages.kludgebot.com-le-ssl.conf`):
   - Proxies all requests to `http://localhost:5060/`
   - Includes WebSocket upgrade support for real-time game updates
   - Uses SSL certificate for `epicages.kludgebot.com`

The virtual host configuration includes WebSocket upgrade rules to support the game's real-time communication.

## Cloudflare DNS

- Add A record: `epicages` → `15.204.94.192` (can use proxy - orange cloud for CDN benefits)
- SSL certificate is managed via Let's Encrypt/Certbot

## Kludgebot dashboard integration

- The dashboard links to `https://epicages.kludgebot.com` as an external link. Update `kludgebot.prod/src/App.jsx` if you rename or change the badge text.

## Recurring maintenance

- When you change `web/src` files, rebuild Vite (`npm run build`) before reloading PM2 so the updated JS/HTML is served.
- If the static bundle appears stale, purge Cloudflare cache for `https://epicages.kludgebot.com/*` after restarting the server.
- Monitor `pm2 logs epicages` to ensure the WebSocket handshake and tick loop stay alive; the server currently logs when it starts but you can extend it to log proposals/events if you need more visibility.
- The simulation runs a passive `setInterval` every two seconds even when no players are connected, so the PM2 process remains the authoritative owner of the world. Its idle footprint is light (memory stays under ~200MB and CPU usage hovers around 1-2% on the current machines) but keep it running so `epicages.kludgebot.com` can immediately show the latest tick when a browser connects.

By documenting these steps and keeping this file updated, you can rehome Epic Ages to another stack without rediscovering the architecture.
