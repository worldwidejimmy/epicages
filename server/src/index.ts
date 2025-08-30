import "dotenv/config";
import { WebSocketServer } from "ws";
import { randomUUID } from "node:crypto";
import type { ClientToServer, ServerToClient, PlayerProposal, World, GameEventShort } from "@shared/types";
import { makeInitialWorld, stepSimulation, validateProposal } from "./sim.js";
import { planFromIntent } from "./planner.js";
import { planWithLLM } from "./llm.js";

const PORT = Number(process.env.PORT || 8787);
let world = makeInitialWorld(Date.now());
let backlog: GameEventShort[] = [];

const wss = new WebSocketServer({ port: PORT }, ()=>{
  console.log(`[server] Epic Ages WS listening on :${PORT}`);
});

function broadcast(msg: ServerToClient){
  const payload = JSON.stringify(msg);
  wss.clients.forEach(c=> { try { (c as any).send(payload); } catch {} });
}

wss.on("connection", (ws)=>{
  ws.send(JSON.stringify({ type:"snapshot", world, events: backlog.slice(-40) } satisfies ServerToClient));
  ws.on("message", async (data)=>{
    try {
      const msg = JSON.parse(data.toString()) as ClientToServer;
      if (msg.type === "proposal") {
        const mapped = await mapIntentIfNeeded(msg.proposal);
        const res = handleProposal(mapped);
        if (!res.ok) {
          ws.send(JSON.stringify({ type:"error", message: res.error } satisfies ServerToClient));
        }
      }
    } catch (e:any) {
      ws.send(JSON.stringify({ type:"error", message: e?.message || "bad message" }));
    }
  });
});

async function mapIntentIfNeeded(p: PlayerProposal): Promise<PlayerProposal> {
  if ((!p.action || p.action === undefined) && p.intentText) {
    try {
      // Try LLM if configured; fallback to naive planner
      return await planWithLLM(world, p.playerId || "anon", p.intentText);
    } catch {
      return planFromIntent(world, p.playerId || "anon", p.intentText);
    }
  }
  return p;
}

type ProposalResult = { ok: true } | { ok: false; error: string };

function handleProposal(p: PlayerProposal): ProposalResult {
  const v = validateProposal(world, p);
  if (!v.ok) return { ok: false, error: v.error };
  const { newWorld, newEvents } = stepSimulation(world, p);
  world = newWorld;
  backlog.push(...newEvents);
  broadcast({ type:"events", events: newEvents, world });
  return { ok: true };
}

// Basic tick for passive world updates
setInterval(()=>{
  const { newWorld, newEvents } = stepSimulation(world, null);
  world = newWorld;
  if (newEvents.length) {
    backlog.push(...newEvents);
    broadcast({ type:"events", events: newEvents, world });
  }
}, 2000);
