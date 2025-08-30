import { randomUUID } from "node:crypto";
import type { World, GameEventShort, PlayerProposal, Neighbor } from "@shared/types";

export function ensureNeighbors(world: World): World {
  if (world.neighbors && world.neighbors.length) return world;
  const n1: Neighbor = {
    id: randomUUID(),
    name: "River Clan",
    attitude: 10,
    status: "peace",
    pop: 20,
    storage: { berries: 40, fish: 30, wood: 20 },
    tech: { fire: true, knapping: true, fishing: true }
  };
  const n2: Neighbor = {
    id: randomUUID(),
    name: "Hill Tribe",
    attitude: -5,
    status: "truce",
    pop: 16,
    storage: { stone: 30, wood: 10 },
    tech: { fire: true, knapping: true }
  };
  world.neighbors = [n1, n2];
  return world;
}

export function diplomacyTick(world: World): GameEventShort[] {
  ensureNeighbors(world);
  const evts: GameEventShort[] = [];
  world.neighbors!.forEach(n => {
    if (n.attitude > 0) n.attitude -= 1;
    if (n.attitude < 0) n.attitude += 1;
    if (Math.random() < 0.03) {
      if (n.status === "war") {
        evts.push({ tick: world.tick, text: `${n.name} raided a hunting party. Losses were minimal.` });
        n.attitude -= 5;
      } else if (n.status === "peace") {
        evts.push({ tick: world.tick, text: `${n.name} shared trail knowledge. Relations improved.` });
        n.attitude += 3;
      }
    }
  });
  return evts;
}

export function handleDiplomacy(world: World, p: PlayerProposal): { events: GameEventShort[] } {
  ensureNeighbors(world);
  const targetName = String(p.args?.target || "");
  const kind = String(p.args?.kind || "gift");
  const amount = Number(p.args?.amount || 10);
  const res = String(p.args?.resource || "wood");
  const s = world.settlements[0];
  const n = world.neighbors!.find(x => x.name.toLowerCase() === targetName.toLowerCase()) || world.neighbors![0];
  const evts: GameEventShort[] = [];

  if (kind === "gift") {
    const have = (s.storage as any)[res] || 0;
    if (have < amount) {
      evts.push({ tick: world.tick, text: `Not enough ${res} to gift.` });
      return { events: evts };
    }
    (s.storage as any)[res] = have - amount;
    (n.storage as any)[res] = ((n.storage as any)[res] || 0) + amount;
    n.attitude += 8;
    n.status = n.status === "war" ? "truce" : n.status;
    evts.push({ tick: world.tick, text: `Gave ${amount} ${res} to ${n.name}. Relations improved.` });
  } else if (kind === "trade") {
    const giveRes = res;
    const wantRes = String(p.args?.want || (res === "wood" ? "stone" : "wood"));
    const have = (s.storage as any)[giveRes] || 0;
    if (have < amount) {
      evts.push({ tick: world.tick, text: `Not enough ${giveRes} to trade.` });
      return { events: evts };
    }
    (s.storage as any)[giveRes] = have - amount;
    (s.storage as any)[wantRes] = ((s.storage as any)[wantRes] || 0) + Math.floor(amount * 0.8);
    n.attitude += 4;
    n.status = "peace";
    evts.push({ tick: world.tick, text: `Traded ${amount} ${giveRes} with ${n.name} for ${Math.floor(amount*0.8)} ${wantRes}.` });
  } else if (kind === "peace") {
    n.status = "peace";
    n.attitude += 5;
    evts.push({ tick: world.tick, text: `Made peace with ${n.name}.` });
  } else if (kind === "war") {
    n.status = "war";
    n.attitude -= 10;
    evts.push({ tick: world.tick, text: `Declared war on ${n.name}. Tensions rise.` });
  } else {
    evts.push({ tick: world.tick, text: `Diplomacy action not understood.` });
  }
  return { events: evts };
}
