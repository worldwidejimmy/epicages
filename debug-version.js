// Quick diagnostic to check version handling
// Run this to see what the server would send

const world = {
  seed: "123",
  width: 48,
  height: 32,
  biomeMap: [],
  tick: 0,
  tech: {},
  settlements: [],
  version: "1.0.0-gameplay-v2"
};

console.log("World object:", JSON.stringify(world, null, 2));
console.log("Version field:", world.version);
console.log("Version check:", world?.version || "unknown");

// Check if version is in snapshot
const snapshot = {
  type: "snapshot",
  world: world,
  events: []
};

console.log("\nSnapshot:", JSON.stringify(snapshot, null, 2));
console.log("Snapshot world.version:", snapshot.world?.version);
