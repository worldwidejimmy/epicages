import type { World } from "@shared/types";

export type TechSpec = {
  id: string;
  requires?: string[];
  cost?: Partial<Record<"wood"|"stone"|"berries"|"fish"|"grain"|"copper"|"tin", number>>;
  grants?: string[];
};

export const TECHS: Record<string, TechSpec> = {
  fire: { id: "fire" },
  knapping: { id: "knapping" },
  fishing: { id: "fishing", requires: ["fire","knapping"] },
  pottery: { id: "pottery", requires: ["fire"] },
  agriculture: { id: "agriculture", requires: ["pottery"] },
  kiln: { id: "kiln", requires: ["pottery"], cost: { wood: 30 } },
  smelting: { id: "smelting", requires: ["kiln"], cost: { wood: 50, stone: 20 } },
  bronze: { id: "bronze", requires: ["smelting"], cost: { copper: 10, tin: 5 } },
  palissade: { id: "palissade", requires: ["knapping"], cost: { wood: 40 } },
};

export function canResearch(world: World, tech: string): { ok: true } | { ok: false; reason: string } {
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

export function payTechCost(world: World, tech: string) {
  const spec = TECHS[tech];
  if (!spec || !spec.cost) return;
  const s = world.settlements[0];
  if (!s) return;
  for (const [res, amt] of Object.entries(spec.cost)) {
    (s.storage as any)[res] = Math.max(0, ((s.storage as any)[res]||0) - (amt as number));
  }
}
