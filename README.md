# Epic Ages

A browser civ-sim where you guide a tiny tribe from **Stone Age** origins through eras, using **natural-language** intents that get mapped into valid actions via rules or an LLM.

## Quickstart
```bash
# Server
cd server
npm i
# optional .env:
# OPENAI_API_KEY=sk-...
# LLM_PROVIDER=openai-compatible
# LLM_MODEL=gpt-4o-mini
npm run dev

# Web
cd ../web
npm i
npm run dev
```
Open http://localhost:5173

## Final Review Notes (for you or any LLM to get up to speed)
(See bottom of this README for the full section.)


---

# Final Review Notes (for you or any LLM to get up to speed)

## What this repo contains
- **server/** – Node/TypeScript authoritative simulation: tick loop, validation, diplomacy, neighbor AI, eras, LLM planner hook.
- **web/** – React + Vite + PixiJS client: tile rendering, HUD, neighbors panel, intent box, touch pan/zoom + zoom buttons, sprite atlases by era.
- **shared/** – Shared TS types.
- **chat.md** – Running design summary to re-seed an LLM.
- **roadmap.md** – Prioritized next steps.
- **.gitignore** – Keeps `node_modules` and `.env` out of Git.

## Running locally
```bash
# Server
cd server
npm i
# optional .env
# OPENAI_API_KEY=sk-...
# LLM_PROVIDER=openai-compatible
# LLM_MODEL=gpt-4o-mini
npm run dev     # http://localhost:8787

# Web
cd ../web
npm i
npm run dev     # http://localhost:5173
```
- Use HUD buttons for quick actions; try the **Intent** box: “build a fence”, “research smelting”, “gift the river clan 10 wood”.
- **Touch**: drag to pan, pinch/scroll to zoom, or use the zoom buttons.

## Gotchas & quick fixes
1. **Path alias (`@shared/*`) in server**  
   - If dev fails to resolve `@shared/types`, install runtime mapping:
     ```bash
     cd server
     npm i -D tsconfig-paths
     ```
     and ensure your dev script includes:  
     `ts-node-dev --respawn --transpile-only -r tsconfig-paths/register src/index.ts`
   - For production builds we convert aliases with **tsc-alias** (see Deploy below).

2. **LLM usage**  
   - Works offline via **naive keyword planner**.  
   - With API keys, the server can call an OpenAI-compatible endpoint and use **function-calling** to get structured actions.
   - Keep world summaries short; cache responses to save tokens.

3. **Sprites**  
   - Replace `/web/public/assets/atlas_{era}.png` with real 16×16 tile strips in this order: **water, grass, forest, mountain**.

4. **Favicon / Splash**  
   - Favicon at `/web/public/assets/favicon.png` (transparent caveman face).  
   - Splash logo at `/web/public/assets/epic-ages-logo.png`.

## Deployment (one path per side)

### Server → Fly.io
We build the server into JS and run it as a container.

1) Add build tools (only once):
```bash
cd server
npm i -D tsc-alias
# in package.json set:
# "build": "tsc -p tsconfig.json && tsc-alias -p tsconfig.json"
```

2) `server/Dockerfile`:
```Dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY .. /app
WORKDIR /app/server
RUN npm ci || npm i
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/server/dist ./dist
ENV NODE_ENV=production
EXPOSE 8787
CMD ["node", "dist/index.js"]
```

3) `server/fly.toml`:
```toml
app = "epic-ages-server"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 8787
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
```

4) Deploy:
```bash
cd server
flyctl launch --no-deploy
flyctl secrets set OPENAI_API_KEY=sk-... LLM_PROVIDER=openai-compatible LLM_MODEL=gpt-4o-mini
flyctl deploy
```

### Web → Vercel
- Import the **`/web`** folder as the project root.
- Build command: `npm run build`
- Output dir: `dist`
- Env: `VITE_SERVER_WS=wss://<your-fly-app>.fly.dev`

### Web → Netlify
Create `web/netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Production notes
- Use the LLM sparingly (milestones), with caching.
- Keep the server authoritative; validate every LLM plan against rules.
- Add Postgres/Redis for persistence and queues as you scale.

## Roadmap pointers
See `roadmap.md` for next steps (art, economy/roles, multiplayer rooms, narration, hosting).
