const baseUrl = process.env.DEEPSTAKE_WEB_BASE_URL || "http://127.0.0.1:3090";

async function request(path, init) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });
  if (!response.ok) {
    throw new Error(`${init?.method || "GET"} ${path} failed with ${response.status}`);
  }
  return response.json();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNumber(value, message) {
  assert(typeof value === "number" && Number.isFinite(value), message);
}

const reset = await request("/api/world", {
  method: "POST",
  body: JSON.stringify({ action: "reset" })
});

assert(reset.world.schemaVersion === 1, "schema version should remain v1");
assert(reset.world.chunkSizeTiles === 8, "chunk size should remain 8x8");
assert(reset.diagnostics.activeStructures >= 9, "seeded settlement should contain at least 9 active structures");
assert(reset.diagnostics.dirtyChunks > 0, "reset seed should mark chunks dirty for batch preview");
assert(reset.saveBatches.length > 0, "dirty chunks should generate save batches");
assert(reset.diagnostics.roadNetworkChunks >= 3, "seeded settlement should contain a multi-chunk road network");
assert(reset.diagnostics.boundaryViolations === 0, "seeded settlement should have no region boundary violations");
assert(reset.diagnostics.settlements >= 2, "seeded world should include multiple settlements/owners");
assert(Array.isArray(reset.settlements) && reset.settlements.length >= 2, "settlement summaries should be returned");
assert(Array.isArray(reset.lifecycle.loadWindowChunkKeys), "load window keys should be returned");
assertNumber(reset.diagnostics.connectivityIssues, "connectivity issue count should be numeric");
assertNumber(reset.diagnostics.requirementIssues, "requirement issue count should be numeric");

const placed = await request("/api/world", {
  method: "POST",
  body: JSON.stringify({
    action: "place",
    pieceId: "Wall",
    chunkX: 1,
    chunkY: 1,
    tileX: 2,
    tileY: 2,
    rotation: 0,
    ownerId: "settlement-alpha",
    regionId: "alpha-road",
    settlementId: "settlement-alpha"
  })
});

assert(placed.diagnostics.activeStructures === reset.diagnostics.activeStructures + 1, "place should add one active structure");
const placedRecord = placed.world.structures.find(
  (structure) => structure.pieceId === "Wall" && structure.chunkX === 1 && structure.chunkY === 1 && structure.tileX === 2 && structure.tileY === 2
);
assert(placedRecord, "placed structure should be discoverable by chunk/tile");

const rotated = await request("/api/world", {
  method: "POST",
  body: JSON.stringify({ action: "rotate", recordId: placedRecord.recordId })
});
const rotatedRecord = rotated.world.structures.find((structure) => structure.recordId === placedRecord.recordId);
assert(rotatedRecord?.rotation === 90, "rotate should advance the placed structure rotation by 90 degrees");

const removed = await request("/api/world", {
  method: "POST",
  body: JSON.stringify({ action: "remove", recordId: placedRecord.recordId })
});
assert(removed.diagnostics.activeStructures === reset.diagnostics.activeStructures, "remove should clear the placed structure from active records");

const advanced = await request("/api/world", {
  method: "POST",
  body: JSON.stringify({ action: "advance-day" })
});
assert(advanced.world.worldDay === reset.world.worldDay + 1, "advance-day should increment the world day");
assert(
  advanced.world.structures.some((structure) => structure.state !== "removed" && structure.durability < 100),
  "advance-day should visibly change settlement structure durability"
);

const mixedRegionAttempt = await request("/api/world", {
  method: "POST",
  body: JSON.stringify({
    action: "place",
    pieceId: "Wall",
    chunkX: 0,
    chunkY: 0,
    tileX: 4,
    tileY: 4,
    rotation: 0,
    ownerId: "settlement-alpha",
    regionId: "alpha-edge"
  })
});

assert(
  mixedRegionAttempt.diagnostics.activeStructures === reset.diagnostics.activeStructures,
  "placing a second region into an occupied chunk should be rejected"
);
assert(mixedRegionAttempt.diagnostics.boundaryViolations === 0, "rejected mixed-region placement should not create boundary violations");

const clean = await request("/api/world", {
  method: "POST",
  body: JSON.stringify({ action: "mark-clean" })
});

assert(clean.diagnostics.dirtyChunks === 0, "mark-clean should clear dirty chunks");
assert(clean.saveBatches.length === 0, "clean world should have no save batches");

const transferred = await request("/api/world", {
  method: "POST",
  body: JSON.stringify({
    action: "transfer-ownership",
    chunkX: 0,
    chunkY: 0,
    ownerId: "settlement-alpha",
    regionId: "alpha-core",
    settlementId: "settlement-alpha"
  })
});

assert(transferred.diagnostics.dirtyChunks === 1, "ownership transfer should mark the target chunk dirty");
assert(transferred.saveBatches.length === 1, "single dirty chunk should create one save batch");
assert(transferred.settlements.some((settlement) => settlement.settlementId === "settlement-alpha"), "settlement-alpha summary should exist");

const persisted = await request("/api/world");
assert(persisted.diagnostics.dirtyChunks === transferred.diagnostics.dirtyChunks, "dirty chunk state should persist through JSON reload");
assert(persisted.diagnostics.activeStructures === transferred.diagnostics.activeStructures, "structure count should persist through JSON reload");

console.log(
  JSON.stringify(
    {
      status: "passed",
      baseUrl,
      activeStructures: persisted.diagnostics.activeStructures,
      dirtyChunks: persisted.diagnostics.dirtyChunks,
      saveBatches: persisted.saveBatches.length,
      settlements: persisted.diagnostics.settlements,
      connectivityIssues: persisted.diagnostics.connectivityIssues,
      requirementIssues: persisted.diagnostics.requirementIssues
    },
    null,
    2
  )
);
