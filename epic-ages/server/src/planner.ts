import type { World, PlayerProposal } from "@shared/types";

export function planFromIntent(world: World, playerId: string, intentText: string): PlayerProposal {
  const intent = intentText.toLowerCase();
  const firstSettlement = world.settlements[0]?.id || "";
  const harvest = (resource: "berries"|"fish"|"wood"|"stone", amount = 5) => ({
    playerId, action: "harvest", args: { resource, amount, settlementId: firstSettlement }, intentText
  }) as PlayerProposal;

  if (/\b(fence|wall|palis+ade|palisade)\b/.test(intent)) {
    return { playerId, action: "build", args: { structure: "palissade", settlementId: firstSettlement }, intentText };
  }
  if (/\b(hut|house|home|shelter)\b/.test(intent)) {
    return { playerId, action: "build", args: { structure: "hut", settlementId: firstSettlement }, intentText };
  }
  if (/\bpottery|pots|clay\b/.test(intent)) {
    return { playerId, action: "research", args: { tech: "pottery" }, intentText };
  }
  if (/\bkiln\b/.test(intent)) {
    return { playerId, action: "research", args: { tech: "kiln" }, intentText };
  }
  if (/\bsmelt|smelting|furnace\b/.test(intent)) {
    return { playerId, action: "research", args: { tech: "smelting" }, intentText };
  }
  if (/\bbronze\b/.test(intent)) {
    return { playerId, action: "research", args: { tech: "bronze" }, intentText };
  }
  if (/\bfarm|agriculture|fields|grain|wheat|barley\b/.test(intent)) {
    return { playerId, action: "research", args: { tech: "agriculture" }, intentText };
  }
  if (/\bfish|fishing|river|lake\b/.test(intent)) return harvest("fish", 5);
  if (/\bwood|logs|lumber|chop\b/.test(intent)) return harvest("wood", 8);
  if (/\bstone|rocks|quarry\b/.test(intent)) return harvest("stone", 6);
  if (/\bberry|berries|forage\b/.test(intent)) return harvest("berries", 6);
  if (/\bsettle|migrate|new camp|found\b/.test(intent)) {
    return { playerId, action: "migrate", args: {}, intentText };
  }
  return harvest("berries", 5);
}
