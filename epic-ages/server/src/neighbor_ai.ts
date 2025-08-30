import type { World, GameEventShort } from "@shared/types";
import { TECHS, canResearch } from "./tech.js";

export function neighborAITick(world: World): GameEventShort[] {
  const evts: GameEventShort[] = [];
  if (!world.neighbors) return evts;
  for (const n of world.neighbors) {
    if (Math.random() < Math.min(0.05, n.pop / 2000)) {
      const candidates = Object.keys(TECHS).filter(t => !(n.tech as any)[t]);
      for (const t of candidates) {
        const fakeWorld: World = { ...world, tech: n.tech as any, settlements: world.settlements };
        const ok = canResearch(fakeWorld, t);
        if (ok.ok) {
          (n.tech as any)[t] = true;
          evts.push({ tick: world.tick, text: `${n.name} advanced: ${t}.` });
          break;
        }
      }
    }
    if (Math.random() < 0.03) {
      const structure = Math.random() < 0.5 ? "hut" : "palissade";
      evts.push({ tick: world.tick, text: `${n.name} built a ${structure}.` });
    }
    if (Math.random() < 0.2) n.pop += 1;
  }
  return evts;
}
