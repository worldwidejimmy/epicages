import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../state";
import type { World, PlayerProposal } from "../../../shared/types";

const BOT_INTERVAL_MS = 3500;

function decideBotAction(world: World): PlayerProposal | null {
  const s = world.settlements?.[0];
  if (!s) return null;
  const settlementId = s.id;
  const food = (s.storage?.berries || 0) + (s.storage?.fish || 0);
  const wood = s.storage?.wood || 0;

  // Housing capacity
  let housingCap = 0;
  s.structures?.forEach(st => {
    if (st === "campfire") housingCap += 5;
    else if (st === "hut") housingCap += 10;
  });

  // 1. Starving — harvest food
  if (food < 8) {
    return { playerId: "local", action: "harvest", args: { resource: "berries", amount: 6, settlementId } };
  }

  // 2. At housing capacity and have wood — build hut
  if (s.pop >= housingCap - 2 && wood >= 15) {
    return { playerId: "local", action: "build", args: { structure: "hut", settlementId } };
  }

  // 3. Research techs in progression order
  const techOrder: Array<keyof typeof world.tech> = ["pottery", "agriculture", "kiln", "smelting", "bronze"];
  for (const tech of techOrder) {
    if (!world.tech?.[tech]) {
      return { playerId: "local", action: "research", args: { tech } };
    }
  }

  // 4. Build farm once wood is sufficient
  if (wood >= 25 && !s.structures.includes("farm")) {
    return { playerId: "local", action: "build", args: { structure: "farm", settlementId } };
  }

  // 5. Gather wood if low
  if (wood < 20) {
    return { playerId: "local", action: "harvest", args: { resource: "wood", amount: 8, settlementId } };
  }

  // Default — keep food stocked
  return { playerId: "local", action: "harvest", args: { resource: "berries", amount: 6, settlementId } };
}

function formatAction(action: PlayerProposal): string {
  const relevant = Object.entries(action.args)
    .filter(([k]) => k !== "settlementId")
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return relevant ? `${action.action} (${relevant})` : action.action;
}

export function useBotMode() {
  const [enabled, setEnabled] = useState(false);
  const [lastAction, setLastAction] = useState("—");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (enabled) {
      intervalRef.current = setInterval(() => {
        const world = useGameStore.getState().world;
        if (!world) return;
        const action = decideBotAction(world);
        if (action) {
          useGameStore.getState().send({ type: "proposal", proposal: action });
          setLastAction(formatAction(action));
        }
      }, BOT_INTERVAL_MS);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled]);

  return { enabled, setEnabled, lastAction };
}
