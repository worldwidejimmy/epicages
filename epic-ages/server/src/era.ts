import type { World, Era } from "@shared/types";

type EraRule = { id: Era; requires: string[]; };

export const ERA_RULES: EraRule[] = [
  { id: "stone", requires: ["fire","knapping"] },
  { id: "copper", requires: ["smelting"] },
  { id: "bronze", requires: ["bronze"] },
  { id: "iron", requires: ["bronze"] },
  { id: "medieval", requires: ["agriculture","pottery","kiln"] }
];

export function computeEra(world: World): Era {
  const known = new Set(Object.entries(world.tech).filter(([,v])=> !!v).map(([k])=> k));
  let current: Era = "stone";
  for (const rule of ERA_RULES) {
    if (rule.requires.every(t => known.has(t))) current = rule.id;
  }
  return current;
}
