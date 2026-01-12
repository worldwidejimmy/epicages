import type { World, PlayerProposal } from "../../shared/types";

// Client-side validation helpers that mirror server logic
// These provide immediate feedback before sending to server

const TECHS: Record<string, { requires?: string[]; cost?: Record<string, number> }> = {
  fire: {},
  knapping: {},
  fishing: { requires: ["fire", "knapping"] },
  pottery: { requires: ["fire"] },
  agriculture: { requires: ["pottery"] },
  kiln: { requires: ["pottery"], cost: { wood: 30 } },
  smelting: { requires: ["kiln"], cost: { wood: 50, stone: 20 } },
  bronze: { requires: ["smelting"], cost: { copper: 10, tin: 5 } },
  palissade: { requires: ["knapping"], cost: { wood: 40 } },
};

const STRUCTURE_COSTS: Record<string, Record<string, number>> = {
  hut: { wood: 15 },
  charcoal_kiln: { wood: 40, stone: 10 },
  palissade: { wood: 40 },
  farm: { wood: 30, stone: 15 },
  forge: { wood: 50, stone: 30 },
  bronze_workshop: { wood: 60, stone: 40, copper: 10 },
};

const STRUCTURE_TECH_REQUIREMENTS: Record<string, string> = {
  charcoal_kiln: "kiln",
  palissade: "palissade",
  farm: "agriculture",
  forge: "smelting",
  bronze_workshop: "bronze",
};

export function canResearchTech(world: World | null, tech: string): { ok: true } | { ok: false; reason: string } {
  if (!world) return { ok: false, reason: "World not loaded" };
  
  const spec = TECHS[tech];
  if (!spec) return { ok: false, reason: "Unknown tech" };
  if (world.tech[tech as any]) return { ok: false, reason: "Already known" };
  
  if (spec.requires) {
    for (const r of spec.requires) {
      if (!world.tech[r as any]) return { ok: false, reason: `Missing prerequisite: ${r}` };
    }
  }
  
  const s = world.settlements[0];
  if (spec.cost && s) {
    for (const [res, amt] of Object.entries(spec.cost)) {
      const have = (s.storage as any)[res] || 0;
      if (have < (amt as number)) return { ok: false, reason: `Not enough ${res}` };
    }
  }
  
  return { ok: true };
}

export function canBuildStructure(world: World | null, structure: string): { ok: true } | { ok: false; reason: string } {
  if (!world) return { ok: false, reason: "World not loaded" };
  
  const s = world.settlements[0];
  if (!s) return { ok: false, reason: "No settlement found" };
  
  const techReq = STRUCTURE_TECH_REQUIREMENTS[structure];
  if (techReq && !world.tech[techReq as any]) {
    return { ok: false, reason: `Need ${techReq} tech to build ${structure}` };
  }
  
  const cost = STRUCTURE_COSTS[structure];
  if (!cost) return { ok: false, reason: `Unknown structure: ${structure}` };
  
  for (const [res, amt] of Object.entries(cost)) {
    const have = (s.storage as any)[res] || 0;
    if (have < amt) return { ok: false, reason: `Need ${amt} ${res} to build ${structure}` };
  }
  
  return { ok: true };
}

export function validateAction(world: World | null, proposal: PlayerProposal): { ok: true } | { ok: false; error: string } {
  if (!world) return { ok: false, error: "World not loaded" };
  
  if (proposal.action === "research") {
    const tech = String(proposal.args?.tech || "");
    const result = canResearchTech(world, tech);
    if (!result.ok) return { ok: false, error: result.reason };
  } else if (proposal.action === "build") {
    const structure = String(proposal.args?.structure || "");
    const result = canBuildStructure(world, structure);
    if (!result.ok) return { ok: false, error: result.reason };
  } else if (proposal.action === "harvest") {
    const amount = Number(proposal.args?.amount || 0);
    if (amount <= 0) return { ok: false, error: "Harvest amount must be > 0" };
  } else if (proposal.action === "craft") {
    if (!world.tech.smelting) {
      return { ok: false, error: "Need smelting tech to craft" };
    }
    const s = world.settlements[0];
    if (!s) return { ok: false, error: "No settlement found" };
    const cost = { wood: 10, stone: 5 };
    if ((s.storage.wood || 0) < cost.wood) {
      return { ok: false, error: `Need ${cost.wood} wood to craft` };
    }
    if ((s.storage.stone || 0) < cost.stone) {
      return { ok: false, error: `Need ${cost.stone} stone to craft` };
    }
  }
  
  return { ok: true };
}

export function getStructureCost(structure: string): Record<string, number> {
  return STRUCTURE_COSTS[structure] || { wood: 10 };
}

export function getStructureTechRequirement(structure: string): string | null {
  return STRUCTURE_TECH_REQUIREMENTS[structure] || null;
}

export function getAllStructures(): string[] {
  return Object.keys(STRUCTURE_COSTS);
}

export function getAllTechs(): string[] {
  return Object.keys(TECHS);
}
