import "dotenv/config";
import express from "express";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

import { makeInitialWorld, stepSimulation, validateProposal } from "./server/dist/sim.js";
import { planFromIntent } from "./server/dist/planner.js";
import { planWithLLM } from "./server/dist/llm.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 5060);

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());

const staticOpts = {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=0');
    }
  }
};

app.use('/epicages/', express.static(path.join(__dirname, 'web', 'dist'), staticOpts));
app.use(express.static(path.join(__dirname, 'web', 'dist'), staticOpts));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'epic-ages', port: PORT });
});

const wss = new WebSocketServer({ server, path: '/epicages/' });

let world = makeInitialWorld(Date.now());
let backlog = [];

function broadcast(msg) {
  const payload = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    try {
      client.send(payload);
    } catch {}
  });
}

async function mapIntentIfNeeded(p) {
  if ((!p.action || p.action === undefined) && p.intentText) {
    try {
      return await planWithLLM(world, p.playerId || "anon", p.intentText);
    } catch {
      return planFromIntent(world, p.playerId || "anon", p.intentText);
    }
  }
  return p;
}

function handleProposal(p) {
  const validation = validateProposal(world, p);
  if (!validation.ok) return { ok: false, error: validation.error };
  const { newWorld, newEvents } = stepSimulation(world, p);
  world = newWorld;
  backlog.push(...newEvents);
  broadcast({ type: "events", events: newEvents, world });
  return { ok: true };
}

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "snapshot", world, events: backlog.slice(-40) }));
  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "proposal") {
        const mapped = await mapIntentIfNeeded(msg.proposal);
        const res = handleProposal(mapped);
        if (!res.ok) {
          ws.send(JSON.stringify({ type: "error", message: res.error }));
        }
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: "error", message: error?.message || "bad message" }));
    }
  });
});

setInterval(() => {
  const { newWorld, newEvents } = stepSimulation(world, null);
  world = newWorld;
  if (newEvents.length) {
    backlog.push(...newEvents);
    broadcast({ type: "events", events: newEvents, world });
  }
}, 2000);

app.use('/epicages/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'dist', 'index.html'));
});

app.use('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'dist', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`🚀 Epic Ages running on http://localhost:${PORT}`);
  console.log(`📁 Available at: http://localhost:${PORT}/ and /epicages/`);
});
