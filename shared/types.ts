export type Resource = "berries"|"fish"|"wood"|"stone"|"grain"|"copper"|"tin";
export type Tile = 0|1|2|3; // 0 water, 1 grass, 2 forest, 3 mountain
export type TechId = "fire"|"knapping"|"fishing"|"pottery"|"agriculture"|"kiln"|"smelting"|"bronze"|"palissade";
export type TechLevel = boolean;
export type Era = "stone"|"copper"|"bronze"|"iron"|"medieval";

export type Settlement = {
  id: string;
  name: string;
  pos: { x: number; y: number };
  storage: Partial<Record<Resource, number>>;
  structures: string[];
  pop: number;
  era?: Era;
};

export type DiplomacyStatus = "peace" | "war" | "truce";
export type Neighbor = {
  id: string;
  name: string;
  attitude: number; // -100..100
  status: DiplomacyStatus;
  pop: number;
  storage: Partial<Record<Resource, number>>;
  tech: Partial<Record<TechId, TechLevel>>;
};

export type World = {
  seed: string;
  width: number;
  height: number;
  biomeMap: Tile[];
  tick: number;
  tech: Partial<Record<TechId, TechLevel>>;
  settlements: Settlement[];
  neighbors?: Neighbor[];
  era?: Era;
};

export type GameEventShort = { tick: number; text: string };

export type PlayerProposal = {
  playerId: string;
  action: "build"|"harvest"|"research"|"migrate"|"craft"|"defend"|"diplomacy";
  args: Record<string, unknown>;
  intentText?: string;
};

export type ServerToClient =
  | { type: "snapshot"; world: World; events: GameEventShort[] }
  | { type: "events"; events: GameEventShort[]; world?: World }
  | { type: "error"; message: string };

export type ClientToServer =
  | { type: "hello"; name?: string }
  | { type: "proposal"; proposal: PlayerProposal };
