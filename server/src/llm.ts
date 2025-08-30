import { createHash } from "node:crypto";
import type { World, PlayerProposal } from "@shared/types";

type Provider = "openai-compatible" | "none";
const PROVIDER: Provider = (process.env.LLM_PROVIDER as Provider) || (process.env.OPENAI_API_KEY ? "openai-compatible" : "none");
const OPENAI_URL = process.env.LLM_BASE_URL || "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.LLM_MODEL || "gpt-4o-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

class LRU<K, V> {
  private max: number;
  private map: Map<K, V>;
  constructor(max = 64) { this.max = max; this.map = new Map(); }
  get(k: K): V | undefined {
    const v = this.map.get(k);
    if (v !== undefined) { this.map.delete(k); this.map.set(k, v); }
    return v;
  }
  set(k: K, v: V) {
    if (this.map.has(k)) this.map.delete(k);
    this.map.set(k, v);
    if (this.map.size > this.max) {
      const first = this.map.keys().next().value;
      this.map.delete(first);
    }
  }
}
const cache = new LRU<string, PlayerProposal>(128);

function summarizeWorld(world: World){
  const s = world.settlements[0];
  const neighbors = (world.neighbors || []).map(n => ({ name: n.name, attitude: n.attitude, status: n.status, pop: n.pop }));
  return {
    tick: world.tick,
    resources: s?.storage || {},
    tech: world.tech,
    pop: s?.pop || 0,
    neighbors
  };
}

export async function planWithLLM(world: World, playerId: string, intentText: string): Promise<PlayerProposal> {
  if (PROVIDER === "none") {
    return { playerId, action: "harvest", args: { resource: "berries", amount: 5, settlementId: world.settlements[0]?.id || "" }, intentText };
  }
  const prompt = [
    { role: "system", content: "You are a strict game planner for a historical civ-sim. Return one valid action using the function. Obey plausible tech constraints." },
    { role: "user", content: `Intent: ${intentText}\nWorld: ${JSON.stringify(summarizeWorld(world))}` }
  ];
  const key = createHash("sha256").update(JSON.stringify(prompt)).digest("hex");
  const cached = cache.get(key);
  if (cached) return cached;

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: prompt,
      tools: [{
        type: "function",
        function: {
          name: "plan_action",
          description: "Return a single game action based on player intent and summarized world state.",
          parameters: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["harvest","build","research","migrate","craft","defend","diplomacy"] },
              args: { type: "object", additionalProperties: true }
            },
            required: ["action","args"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "plan_action" } },
      temperature: 0.2
    })
  });
  if (!res.ok) throw new Error(`LLM ${res.status}`);
  const data = await res.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (call?.function?.arguments) {
    try {
      const parsed = JSON.parse(call.function.arguments);
      const proposal: PlayerProposal = { playerId, action: parsed.action || "harvest", args: parsed.args || {}, intentText };
      cache.set(key, proposal);
      return proposal;
    } catch {}
  }
  return { playerId, action: "harvest", args: { resource: "berries", amount: 5 }, intentText };
}
