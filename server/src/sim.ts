import { randomUUID } from "node:crypto";
import type { World, GameEventShort, PlayerProposal, Settlement, Resource, Tile } from "@shared/types";
import { canResearch, payTechCost } from "./tech.js";
import { ensureNeighbors, diplomacyTick, handleDiplomacy } from "./diplomacy.js";
import { computeEra } from "./era.js";
import { neighborAITick } from "./neighbor_ai.js";

export function makeInitialWorld(seed: number): World {
  const width = 48, height = 32;
  const biomeMap: Tile[] = [];
  for (let y=0;y<height;y++){
    for (let x=0;x<width;x++){
      const n = (Math.sin((x+seed)*0.07)+Math.cos((y+seed)*0.05));
      let t: Tile = 1;
      if (n < -0.6) t = 0; // water
      else if (n > 1.0) t = 3; // mountain
      else if (n > 0.3) t = 2; // forest
      biomeMap.push(t);
    }
  }
  const start: Settlement = {
    id: randomUUID(),
    name: "Hearth-1",
    pos: { x: Math.floor(width/2), y: Math.floor(height/2) },
    storage: { berries: 40, fish: 10, wood: 20, stone: 10 },
    structures: ["campfire"],
    pop: 15,
    era: "stone"
  };
  const base: World = {
    seed: String(seed),
    width, height,
    biomeMap,
    tick: 0,
    tech: { fire: true, knapping: true },
    settlements: [start]
  };
  const withN = ensureNeighbors(base);
  withN.era = "stone";
  withN.settlements.forEach(s=> s.era = "stone");
  return withN;
}

export function validateProposal(world: World, p: PlayerProposal): { ok: true } | { ok: false; error: string } {
  if (!p) return { ok: false, error: "No proposal" };
  if (p.action === "research") {
    const tech = String(p.args?.tech || "");
    const chk = canResearch(world, tech);
    if (!chk.ok) return { ok: false, error: `Cannot research ${tech}: ${chk.reason}` };
  }
  if (p.action === "build") {
    const sId = String(p.args?.settlementId || "");
    const s = world.settlements.find(s => s.id === sId) || world.settlements[0];
    if (!s) return { ok: false, error: "Unknown settlement." };
    const structure = String(p.args?.structure || "hut");
    const cost: Record<string, number> = structure === "hut" ? { wood: 15 } :
                                         structure === "charcoal_kiln" ? { wood: 40, stone: 10 } :
                                         structure === "palissade" ? { wood: 40 } : { wood: 10 };
    for (const [res, amt] of Object.entries(cost)) {
      const have = (s.storage as any)[res] || 0;
      if (have < amt) return { ok: false, error: `Need ${amt} ${res} to build ${structure}` };
    }
  }
  if (p.action === "harvest") {
    const amount = Number(p.args?.amount || 0);
    if (amount <= 0) return { ok: false, error: "Harvest amount must be > 0" };
  }
  return { ok: true };
}

export function stepSimulation(world: World, proposal: PlayerProposal | null): { newWorld: World; newEvents: GameEventShort[] } {
  const newWorld: World = JSON.parse(JSON.stringify(world));
  newWorld.tick++;
  const events: GameEventShort[] = [];

  if (proposal) {
    switch (proposal.action) {
      case "harvest": {
        const res = String(proposal.args?.resource || "berries") as Resource;
        const amt = Number(proposal.args?.amount || 5);
        const sId = String(proposal.args?.settlementId || newWorld.settlements[0].id);
        const s = newWorld.settlements.find(s => s.id === sId)!;
        (s.storage as any)[res] = ((s.storage as any)[res] || 0) + amt;
        events.push({ tick: newWorld.tick, text: `Gathered ${amt} ${res} at ${s.name}.` });
        break;
      }
      case "build": {
        const structure = String(proposal.args?.structure || "hut");
        const sId = String(proposal.args?.settlementId || newWorld.settlements[0].id);
        const s = newWorld.settlements.find(s => s.id === sId)!;
        const cost: Record<string, number> = structure === "hut" ? { wood: 15 } :
                                             structure === "charcoal_kiln" ? { wood: 40, stone: 10 } :
                                             structure === "palissade" ? { wood: 40 } : { wood: 10 };
        for (const [res, amt] of Object.entries(cost)) {
          (s.storage as any)[res] = Math.max(0, ((s.storage as any)[res]||0) - amt);
        }
        s.structures.push(structure);
        events.push({ tick: newWorld.tick, text: `Built a ${structure} at ${s.name}.` });
        break;
      }
      case "research": {
        const tech = String(proposal.args?.tech || "pottery");
        (newWorld.tech as any)[tech] = true;
        payTechCost(newWorld, tech);
        events.push({ tick: newWorld.tick, text: `Discovered ${tech}.` });
        break;
      }
      case "diplomacy": {
        const result = handleDiplomacy(newWorld, proposal);
        events.push(...result.events);
        break;
      }
      case "migrate": {
        const s = newWorld.settlements[0];
        s.pos.x = Math.max(2, Math.min(newWorld.width-3, s.pos.x + (Math.random()<0.5?-2:2)));
        s.pos.y = Math.max(2, Math.min(newWorld.height-3, s.pos.y + (Math.random()<0.5?-2:2)));
        events.push({ tick: newWorld.tick, text: `The camp has moved to a new area.` });
        break;
      }
    }
  }

  // passive trickle
  newWorld.settlements.forEach(s => {
    (s.storage.berries as any) = ((s.storage.berries||0) + 1);
    if (Math.random() < 0.2) s.pop += 1;
  });

  // Recompute era
  const prevEra = newWorld.era || "stone";
  const nowEra = computeEra(newWorld);
  if (nowEra !== prevEra) {
    newWorld.era = nowEra;
    newWorld.settlements.forEach(s=> s.era = nowEra);
    events.push({ tick: newWorld.tick, text: `Era advanced to ${nowEra}.` });
  }

  // Diplomacy + neighbor AI
  const dip = diplomacyTick(newWorld);
  if (dip.length) events.push(...dip);
  const aiEv = neighborAITick(newWorld);
  if (aiEv.length) events.push(...aiEv);

  return { newWorld, newEvents: events };
}
