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
    if (!chk.ok) return { ok: false, error: `Cannot research ${tech}: ${(chk as { ok: false; reason: string }).reason}` };
  }
  if (p.action === "build") {
    const sId = String(p.args?.settlementId || "");
    const s = world.settlements.find(s => s.id === sId) || world.settlements[0];
    if (!s) return { ok: false, error: "Unknown settlement." };
    const structure = String(p.args?.structure || "hut");
    
    // Check tech requirements
    if (structure === "charcoal_kiln" && !world.tech.kiln) {
      return { ok: false, error: "Need kiln tech to build charcoal_kiln" };
    }
    if (structure === "palissade" && !world.tech.palissade) {
      return { ok: false, error: "Need palissade tech to build palissade" };
    }
    if (structure === "farm" && !world.tech.agriculture) {
      return { ok: false, error: "Need agriculture tech to build farm" };
    }
    if (structure === "forge" && !world.tech.smelting) {
      return { ok: false, error: "Need smelting tech to build forge" };
    }
    if (structure === "bronze_workshop" && !world.tech.bronze) {
      return { ok: false, error: "Need bronze tech to build bronze_workshop" };
    }
    
    const cost: Record<string, number> = 
      structure === "hut" ? { wood: 15 } :
      structure === "charcoal_kiln" ? { wood: 40, stone: 10 } :
      structure === "palissade" ? { wood: 40 } :
      structure === "farm" ? { wood: 30, stone: 15 } :
      structure === "forge" ? { wood: 50, stone: 30 } :
      structure === "bronze_workshop" ? { wood: 60, stone: 40, copper: 10 } :
      { wood: 10 };
    for (const [res, amt] of Object.entries(cost)) {
      const have = (s.storage as any)[res] || 0;
      if (have < amt) return { ok: false, error: `Need ${amt} ${res} to build ${structure}` };
    }
  }
  if (p.action === "harvest") {
    const amount = Number(p.args?.amount || 0);
    if (amount <= 0) return { ok: false, error: "Harvest amount must be > 0" };
  }
  if (p.action === "craft") {
    // Craft requires smelting tech
    if (!world.tech.smelting) {
      return { ok: false, error: "Need smelting tech to craft" };
    }
    const item = String(p.args?.item || "");
    if (item !== "tool" && item !== "weapon") {
      return { ok: false, error: "Can only craft 'tool' or 'weapon'" };
    }
    const sId = String(p.args?.settlementId || "");
    const s = world.settlements.find(s => s.id === sId) || world.settlements[0];
    if (!s) return { ok: false, error: "Unknown settlement." };
    const cost = { wood: 10, stone: 5 };
    if ((s.storage.wood || 0) < cost.wood) {
      return { ok: false, error: `Need ${cost.wood} wood to craft ${item}` };
    }
    if ((s.storage.stone || 0) < cost.stone) {
      return { ok: false, error: `Need ${cost.stone} stone to craft ${item}` };
    }
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
        let amt = Number(proposal.args?.amount || 5);
        // Fishing tech enables better fish harvest
        if (res === "fish" && newWorld.tech.fishing) {
          amt = Math.floor(amt * 1.5); // 50% bonus with fishing tech
        }
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
        const cost: Record<string, number> = 
          structure === "hut" ? { wood: 15 } :
          structure === "charcoal_kiln" ? { wood: 40, stone: 10 } :
          structure === "palissade" ? { wood: 40 } :
          structure === "farm" ? { wood: 30, stone: 15 } :
          structure === "forge" ? { wood: 50, stone: 30 } :
          structure === "bronze_workshop" ? { wood: 60, stone: 40, copper: 10 } :
          { wood: 10 };
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
      case "craft": {
        // Craft action requires smelting tech
        if (!newWorld.tech.smelting) {
          events.push({ tick: newWorld.tick, text: "Need smelting tech to craft tools and weapons." });
          break;
        }
        const item = String(proposal.args?.item || "tool");
        const sId = String(proposal.args?.settlementId || newWorld.settlements[0].id);
        const s = newWorld.settlements.find(s => s.id === sId)!;
        
        if (item === "tool" || item === "weapon") {
          const cost = { wood: 10, stone: 5 };
          // Check if we have resources
          if ((s.storage.wood || 0) < cost.wood || (s.storage.stone || 0) < cost.stone) {
            events.push({ tick: newWorld.tick, text: `Need ${cost.wood} wood and ${cost.stone} stone to craft ${item}.` });
            break;
          }
          // Pay cost
          s.storage.wood = Math.max(0, (s.storage.wood || 0) - cost.wood);
          s.storage.stone = Math.max(0, (s.storage.stone || 0) - cost.stone);
          
          // Tools/weapons provide bonuses (stored as metadata, could be used for production/defense bonuses)
          // For now, just record the craft event
          events.push({ tick: newWorld.tick, text: `Crafted a ${item} at ${s.name}.` });
        } else {
          events.push({ tick: newWorld.tick, text: `Unknown craft item: ${item}` });
        }
        break;
      }
    }
  }

  // Calculate housing capacity for each settlement
  function getHousingCapacity(s: Settlement): number {
    let capacity = 0;
    s.structures.forEach(struct => {
      if (struct === "campfire") capacity += 5;
      else if (struct === "hut") capacity += 10;
    });
    return capacity;
  }

  // Process each settlement: food consumption, structure production, population
  newWorld.settlements.forEach(s => {
    // 1. Food consumption (each person consumes 1 food per 2 ticks)
    const totalFood = (s.storage.berries || 0) + (s.storage.fish || 0);
    const foodNeeded = Math.ceil(s.pop / 2);
    
    if (totalFood >= foodNeeded) {
      // Consume food
      let remaining = foodNeeded;
      if (s.storage.berries) {
        const berriesUsed = Math.min(remaining, s.storage.berries);
        s.storage.berries = s.storage.berries - berriesUsed;
        remaining -= berriesUsed;
      }
      if (remaining > 0 && s.storage.fish) {
        const fishUsed = Math.min(remaining, s.storage.fish);
        s.storage.fish = s.storage.fish - fishUsed;
      }
    } else {
      // Starvation: population decreases
      const deficit = foodNeeded - totalFood;
      const starved = Math.min(s.pop, Math.ceil(deficit / 2));
      s.pop = Math.max(1, s.pop - starved);
      if (starved > 0) {
        events.push({ tick: newWorld.tick, text: `${s.name} lost ${starved} people to starvation.` });
      }
      // Consume all available food
      s.storage.berries = 0;
      s.storage.fish = 0;
    }

    // 2. Structure production
    s.structures.forEach(struct => {
      if (struct === "hut") {
        // Hut provides +1 food per tick (hunting/gathering)
        s.storage.berries = ((s.storage.berries || 0) + 1);
      } else if (struct === "charcoal_kiln") {
        // Charcoal kiln provides +1 wood per 2 ticks
        if (newWorld.tick % 2 === 0) {
          s.storage.wood = ((s.storage.wood || 0) + 1);
        }
      } else if (struct === "farm") {
        // Farm provides +2 food per tick (agriculture)
        s.storage.berries = ((s.storage.berries || 0) + 2);
      } else if (struct === "forge") {
        // Forge provides +1 stone per 3 ticks (stone tools)
        if (newWorld.tick % 3 === 0) {
          s.storage.stone = ((s.storage.stone || 0) + 1);
        }
      } else if (struct === "bronze_workshop") {
        // Bronze workshop provides +1 copper per 4 ticks
        if (newWorld.tick % 4 === 0) {
          s.storage.copper = ((s.storage.copper || 0) + 1);
        }
      }
      // Palissade provides defense bonus (handled in diplomacy/raids if implemented)
    });

    // 3. Population growth (only if housing capacity allows)
    const housingCapacity = getHousingCapacity(s);
    if (s.pop < housingCapacity && Math.random() < 0.2) {
      s.pop += 1;
    }
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
