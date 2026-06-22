import type {
  BuildRequirementIssue,
  ChunkLifecycleSimulation,
  ChunkSaveBatch,
  ChunkSummary,
  DirtyChunkRecord,
  PlacedStructure,
  RegionBoundary,
  Rotation,
  SettlementConnectivityIssue,
  SettlementSummary,
  StructureKind,
  WorldDiagnostics,
  WorldPayload,
  WorldState
} from "./types";

export const CHUNK_SIZE_TILES = 8;

export const STRUCTURE_CATALOG: Array<{
  pieceId: StructureKind;
  label: string;
  layer: "floor" | "structure" | "boundary" | "path";
  footprintWidth: number;
  footprintDepth: number;
}> = [
  { pieceId: "Floor", label: "Floor", layer: "floor", footprintWidth: 1, footprintDepth: 1 },
  { pieceId: "Wall", label: "Wall", layer: "structure", footprintWidth: 1, footprintDepth: 1 },
  { pieceId: "Door", label: "Door", layer: "structure", footprintWidth: 1, footprintDepth: 1 },
  { pieceId: "WindowWall", label: "Window Wall", layer: "structure", footprintWidth: 1, footprintDepth: 1 },
  { pieceId: "Fence", label: "Fence", layer: "boundary", footprintWidth: 1, footprintDepth: 1 },
  { pieceId: "Gate", label: "Gate", layer: "boundary", footprintWidth: 1, footprintDepth: 1 },
  { pieceId: "RoadMarker", label: "Road Marker", layer: "path", footprintWidth: 1, footprintDepth: 1 }
];

export const DEFAULT_REGIONS: RegionBoundary[] = [
  { regionId: "alpha-core", label: "Alpha Core", ownerId: "settlement-alpha", minChunkX: 0, maxChunkX: 0, minChunkY: 0, maxChunkY: 0 },
  { regionId: "alpha-edge", label: "Alpha Edge", ownerId: "settlement-alpha", minChunkX: 0, maxChunkX: 1, minChunkY: 0, maxChunkY: 0 },
  { regionId: "alpha-road", label: "Alpha Road", ownerId: "settlement-alpha", minChunkX: 1, maxChunkX: 2, minChunkY: 0, maxChunkY: 1 },
  { regionId: "alpha-dirty-test", label: "Alpha Dirty Test", ownerId: "settlement-alpha", minChunkX: 2, maxChunkX: 2, minChunkY: 1, maxChunkY: 1 },
  { regionId: "beta-outpost", label: "Beta Outpost", ownerId: "settlement-beta", minChunkX: -1, maxChunkX: -1, minChunkY: 0, maxChunkY: 0 }
];

export function createInitialWorld(): WorldState {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    worldId: "deepstake-web-prototype-local",
    worldDay: 1,
    chunkSizeTiles: CHUNK_SIZE_TILES,
    nextRecordId: 1,
    structures: [],
    dirtyChunks: [],
    regions: DEFAULT_REGIONS,
    loadCenter: { chunkX: 0, chunkY: 0 },
    loadRadius: 1,
    updatedAt: now
  };
}

export function buildWorldPayload(world: WorldState): WorldPayload {
  const normalized = normalizeWorldState(world);
  return {
    world: normalized,
    chunks: summarizeChunks(normalized),
    settlements: summarizeSettlements(normalized),
    diagnostics: calculateDiagnostics(normalized),
    saveBatches: buildChunkSaveBatches(normalized),
    lifecycle: simulateChunkLifecycle(normalized),
    boundaryViolations: validateRegionBoundaries(normalized),
    connectivityIssues: validateSettlementConnectivity(normalized),
    requirementIssues: validateBuildRequirements(normalized)
  };
}

export function placeStructure(world: WorldState, input: {
  pieceId: StructureKind;
  chunkX: number;
  chunkY: number;
  tileX: number;
  tileY: number;
  rotation: Rotation;
  ownerId: string;
  regionId: string;
  settlementId?: string;
}): WorldState {
  const catalog = STRUCTURE_CATALOG.find((entry) => entry.pieceId === input.pieceId);
  if (!catalog) return world;
  if (!isTileInBounds(input.tileX, input.tileY, world.chunkSizeTiles)) return world;
  const normalized = normalizeWorldState(world);
  if (!isChunkAllowedForRegion(normalized, input.regionId, input.ownerId, input.chunkX, input.chunkY)) return world;
  if (!isChunkOwnershipCompatible(normalized, input.chunkX, input.chunkY, input.ownerId, input.regionId)) return world;

  const occupied = world.structures.some(
    (structure) =>
      structure.state !== "removed" &&
      structure.chunkX === input.chunkX &&
      structure.chunkY === input.chunkY &&
      structure.tileX === input.tileX &&
      structure.tileY === input.tileY &&
      !canCoexist(structure.pieceId, input.pieceId)
  );
  if (occupied) return world;

  const now = new Date().toISOString();
  const structure: PlacedStructure = {
    recordId: world.nextRecordId,
    pieceId: input.pieceId,
    chunkX: input.chunkX,
    chunkY: input.chunkY,
    tileX: input.tileX,
    tileY: input.tileY,
    rotation: normalizeRotation(input.rotation),
    state: "built",
    durability: 100,
    footprintWidth: catalog.footprintWidth,
    footprintDepth: catalog.footprintDepth,
    ownership: {
      ownerId: input.ownerId || "prototype-local",
      ownerType: input.ownerId ? "settlement" : "system",
      regionId: input.regionId || `region-${input.chunkX}-${input.chunkY}`,
      settlementId: input.settlementId
    },
    createdAt: now,
    updatedAt: now
  };

  return {
    ...world,
    nextRecordId: world.nextRecordId + 1,
    structures: [...world.structures, structure],
    dirtyChunks: markChunkDirty(world, input.chunkX, input.chunkY, "placed", now),
    updatedAt: now
  };
}

export function removeStructure(world: WorldState, recordId: number): WorldState {
  const now = new Date().toISOString();
  const target = world.structures.find((structure) => structure.recordId === recordId);
  return {
    ...world,
    structures: world.structures.map((structure) =>
      structure.recordId === recordId ? { ...structure, state: "removed", updatedAt: now } : structure
    ),
    dirtyChunks: target ? markChunkDirty(world, target.chunkX, target.chunkY, "removed", now) : world.dirtyChunks,
    updatedAt: now
  };
}

export function rotateStructure(world: WorldState, recordId: number): WorldState {
  const now = new Date().toISOString();
  const target = world.structures.find((structure) => structure.recordId === recordId);
  return {
    ...world,
    structures: world.structures.map((structure) =>
      structure.recordId === recordId ? { ...structure, rotation: normalizeRotation((structure.rotation + 90) as Rotation), updatedAt: now } : structure
    ),
    dirtyChunks: target ? markChunkDirty(world, target.chunkX, target.chunkY, "rotated", now) : world.dirtyChunks,
    updatedAt: now
  };
}

export function advanceWorldDay(world: WorldState): WorldState {
  const normalized = normalizeWorldState(world);
  const now = new Date().toISOString();
  const touched = new Set<string>();
  const structures = normalized.structures.map((structure) => {
    if (structure.state === "removed") return structure;
    const stress =
      structure.pieceId === "Fence" || structure.pieceId === "Gate"
        ? 4
        : structure.pieceId === "Wall" || structure.pieceId === "WindowWall"
          ? 3
          : structure.pieceId === "Door"
            ? 2
            : 1;
    const durability = Math.max(1, structure.durability - stress);
    const state = durability < 55 ? "damaged" : structure.state;
    touched.add(chunkKey(structure.chunkX, structure.chunkY));
    return { ...structure, durability, state, updatedAt: now };
  });

  return {
    ...normalized,
    worldDay: normalized.worldDay + 1,
    structures,
    dirtyChunks: [...touched].reduce((dirtyChunks, key) => {
      const [chunkX, chunkY] = key.split(",").map(Number);
      return markChunkDirty({ ...normalized, dirtyChunks }, chunkX, chunkY, "advanced_day", now);
    }, normalized.dirtyChunks),
    updatedAt: now
  };
}

export function updateLoadSimulation(world: WorldState, center: { chunkX: number; chunkY: number }, radius: number): WorldState {
  return {
    ...normalizeWorldState(world),
    loadCenter: center,
    loadRadius: Math.max(0, Math.min(4, Math.floor(radius))),
    updatedAt: new Date().toISOString()
  };
}

export function markAllChunksClean(world: WorldState): WorldState {
  return {
    ...normalizeWorldState(world),
    dirtyChunks: [],
    updatedAt: new Date().toISOString()
  };
}

export function transferChunkOwnership(
  world: WorldState,
  chunkX: number,
  chunkY: number,
  ownerId: string,
  regionId: string,
  settlementId?: string
): WorldState {
  const normalized = normalizeWorldState(world);
  if (!isChunkAllowedForRegion(normalized, regionId, ownerId, chunkX, chunkY)) return normalized;

  const now = new Date().toISOString();
  return {
    ...normalized,
    structures: normalized.structures.map((structure) =>
      structure.state !== "removed" && structure.chunkX === chunkX && structure.chunkY === chunkY
        ? {
            ...structure,
            ownership: {
              ...structure.ownership,
              ownerId,
              ownerType: ownerId ? "settlement" : "system",
              regionId,
              settlementId
            },
            updatedAt: now
          }
        : structure
    ),
    dirtyChunks: markChunkDirty(normalized, chunkX, chunkY, "ownership_transfer", now),
    updatedAt: now
  };
}

export function summarizeChunks(world: WorldState): ChunkSummary[] {
  const chunks = new Map<string, ChunkSummary>();
  for (const structure of world.structures.filter((item) => item.state !== "removed")) {
    const key = chunkKey(structure.chunkX, structure.chunkY);
    const current =
      chunks.get(key) ||
      ({
        key,
        chunkX: structure.chunkX,
        chunkY: structure.chunkY,
        ownerId: structure.ownership.ownerId,
        regionId: structure.ownership.regionId,
        structureCount: 0,
        occupiedTiles: 0,
        damagedCount: 0,
        dirty: isChunkDirty(world, structure.chunkX, structure.chunkY),
        lastChangedAt: getChunkDirtyRecord(world, structure.chunkX, structure.chunkY)?.lastChangedAt ?? null,
        structureTypes: {}
      } satisfies ChunkSummary);
    current.structureCount += 1;
    current.occupiedTiles += structure.footprintWidth * structure.footprintDepth;
    current.damagedCount += structure.state === "damaged" ? 1 : 0;
    current.structureTypes[structure.pieceId] = (current.structureTypes[structure.pieceId] || 0) + 1;
    chunks.set(key, current);
  }

  return [...chunks.values()].sort((a, b) => a.chunkY - b.chunkY || a.chunkX - b.chunkX);
}

export function buildChunkSaveBatches(world: WorldState, batchSize = 3): ChunkSaveBatch[] {
  const dirty = normalizeWorldState(world).dirtyChunks;
  const summaries = summarizeChunks(world);
  const batches: ChunkSaveBatch[] = [];
  for (let index = 0; index < dirty.length; index += batchSize) {
    const group = dirty.slice(index, index + batchSize);
    const structureCount = group.reduce((sum, dirtyChunk) => {
      const summary = summaries.find((chunk) => chunk.key === dirtyChunk.key);
      return sum + (summary?.structureCount ?? 0);
    }, 0);
    batches.push({
      batchId: `batch-${Math.floor(index / batchSize) + 1}`,
      chunkKeys: group.map((chunk) => chunk.key),
      structureCount,
      estimatedBytes: Math.max(128, structureCount * 420 + group.length * 96),
      createdAt: new Date().toISOString()
    });
  }
  return batches;
}

export function simulateChunkLifecycle(world: WorldState): ChunkLifecycleSimulation {
  const normalized = normalizeWorldState(world);
  const occupiedKeys = summarizeChunks(normalized).map((chunk) => chunk.key);
  const loadWindowChunkKeys = buildLoadWindowChunkKeys(normalized.loadCenter, normalized.loadRadius);
  const loadWindow = new Set(loadWindowChunkKeys);
  const loadedChunkKeys = occupiedKeys.filter((key) => loadWindow.has(key));
  const emptyLoadedChunkKeys = loadWindowChunkKeys.filter((key) => !occupiedKeys.includes(key));
  const unloadedChunkKeys = occupiedKeys.filter((key) => !loadedChunkKeys.includes(key));
  const activeStructureCount = normalized.structures.filter((structure) => structure.state !== "removed" && loadedChunkKeys.includes(chunkKey(structure.chunkX, structure.chunkY))).length;

  return {
    center: normalized.loadCenter,
    radius: normalized.loadRadius,
    loadWindowChunkKeys,
    loadedChunkKeys,
    emptyLoadedChunkKeys,
    unloadedChunkKeys,
    activeStructureCount
  };
}

export function calculateDiagnostics(world: WorldState): WorldDiagnostics {
  const active = world.structures.filter((structure) => structure.state !== "removed");
  const owners: Record<string, number> = {};
  const structureTypes: Record<string, number> = {};
  for (const structure of active) {
    owners[structure.ownership.ownerId] = (owners[structure.ownership.ownerId] || 0) + 1;
    structureTypes[structure.pieceId] = (structureTypes[structure.pieceId] || 0) + 1;
  }

  return {
    totalStructures: world.structures.length,
    activeStructures: active.length,
    removedStructures: world.structures.length - active.length,
    occupiedChunks: summarizeChunks(world).length,
    occupiedTiles: active.reduce((sum, structure) => sum + structure.footprintWidth * structure.footprintDepth, 0),
    damagedStructures: active.filter((structure) => structure.state === "damaged").length,
    dirtyChunks: normalizeWorldState(world).dirtyChunks.length,
    saveBatchCount: buildChunkSaveBatches(world).length,
    loadRadius: normalizeWorldState(world).loadRadius,
    boundaryViolations: validateRegionBoundaries(world).length,
    connectivityIssues: validateSettlementConnectivity(world).length,
    requirementIssues: validateBuildRequirements(world).length,
    roadNetworkChunks: countRoadNetworkChunks(world),
    settlements: summarizeSettlements(world).length,
    owners,
    structureTypes
  };
}

export function seedSettlementBlock(world = createInitialWorld()): WorldState {
  const placements: Array<Parameters<typeof placeStructure>[1]> = [
    { pieceId: "Floor", chunkX: 0, chunkY: 0, tileX: 2, tileY: 2, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-core" },
    { pieceId: "Floor", chunkX: 0, chunkY: 0, tileX: 3, tileY: 2, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-core" },
    { pieceId: "Floor", chunkX: 0, chunkY: 0, tileX: 2, tileY: 3, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-core" },
    { pieceId: "WindowWall", chunkX: 0, chunkY: 0, tileX: 1, tileY: 2, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-core" },
    { pieceId: "Wall", chunkX: 0, chunkY: 0, tileX: 2, tileY: 3, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-core" },
    { pieceId: "Door", chunkX: 0, chunkY: 0, tileX: 3, tileY: 3, rotation: 90, ownerId: "settlement-alpha", regionId: "alpha-core" },
    { pieceId: "RoadMarker", chunkX: 0, chunkY: 0, tileX: 3, tileY: 4, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-core" },
    { pieceId: "RoadMarker", chunkX: 0, chunkY: 0, tileX: 4, tileY: 4, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-core" },
    { pieceId: "RoadMarker", chunkX: 0, chunkY: 0, tileX: 5, tileY: 4, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-core" },
    { pieceId: "Fence", chunkX: 0, chunkY: 0, tileX: 6, tileY: 4, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-core" },
    { pieceId: "Fence", chunkX: 0, chunkY: 0, tileX: 7, tileY: 4, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-core" },
    { pieceId: "Gate", chunkX: 1, chunkY: 0, tileX: 0, tileY: 4, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-road" },
    { pieceId: "RoadMarker", chunkX: 1, chunkY: 0, tileX: 1, tileY: 4, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-road" },
    { pieceId: "RoadMarker", chunkX: 1, chunkY: 0, tileX: 2, tileY: 4, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-road" },
    { pieceId: "RoadMarker", chunkX: 1, chunkY: 0, tileX: 3, tileY: 4, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-road" },
    { pieceId: "Floor", chunkX: 1, chunkY: 0, tileX: 3, tileY: 2, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-road" },
    { pieceId: "Floor", chunkX: 1, chunkY: 0, tileX: 4, tileY: 2, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-road" },
    { pieceId: "Wall", chunkX: 1, chunkY: 0, tileX: 3, tileY: 3, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-road" },
    { pieceId: "Door", chunkX: 1, chunkY: 0, tileX: 4, tileY: 3, rotation: 180, ownerId: "settlement-alpha", regionId: "alpha-road" },
    { pieceId: "WindowWall", chunkX: 1, chunkY: 0, tileX: 5, tileY: 2, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-road" },
    { pieceId: "RoadMarker", chunkX: 2, chunkY: 0, tileX: 0, tileY: 4, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-road" },
    { pieceId: "RoadMarker", chunkX: 2, chunkY: 0, tileX: 1, tileY: 4, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-road" },
    { pieceId: "Fence", chunkX: 1, chunkY: 0, tileX: 2, tileY: 5, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-road" },
    { pieceId: "Fence", chunkX: 1, chunkY: 0, tileX: 3, tileY: 5, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-road" },
    { pieceId: "Gate", chunkX: 1, chunkY: 0, tileX: 4, tileY: 5, rotation: 0, ownerId: "settlement-alpha", regionId: "alpha-road" },
    { pieceId: "Wall", chunkX: -1, chunkY: 0, tileX: 7, tileY: 2, rotation: 180, ownerId: "settlement-beta", regionId: "beta-outpost" },
    { pieceId: "Floor", chunkX: -1, chunkY: 0, tileX: 6, tileY: 2, rotation: 0, ownerId: "settlement-beta", regionId: "beta-outpost" },
    { pieceId: "Door", chunkX: -1, chunkY: 0, tileX: 7, tileY: 3, rotation: 90, ownerId: "settlement-beta", regionId: "beta-outpost" }
  ];

  const seeded = placements.reduce((nextWorld, placement) => placeStructure(nextWorld, placement), world);
  return {
    ...seeded,
    dirtyChunks: summarizeChunks(seeded).map((chunk): DirtyChunkRecord => ({
      key: chunk.key,
      chunkX: chunk.chunkX,
      chunkY: chunk.chunkY,
      reason: "seeded",
      dirtySince: seeded.updatedAt,
      lastChangedAt: seeded.updatedAt
    }))
  };
}

export function chunkKey(chunkX: number, chunkY: number) {
  return `${chunkX},${chunkY}`;
}

function isTileInBounds(tileX: number, tileY: number, chunkSize: number) {
  return tileX >= 0 && tileY >= 0 && tileX < chunkSize && tileY < chunkSize;
}

function canCoexist(existing: StructureKind, incoming: StructureKind) {
  return existing === "Floor" || incoming === "Floor";
}

function normalizeRotation(rotation: Rotation): Rotation {
  const normalized = (((rotation % 360) + 360) % 360) as Rotation;
  return ([0, 90, 180, 270] as Rotation[]).includes(normalized) ? normalized : 0;
}

export function normalizeWorldState(world: WorldState): WorldState {
  return {
    ...world,
    worldDay: typeof world.worldDay === "number" ? world.worldDay : 1,
    dirtyChunks: world.dirtyChunks ?? [],
    regions: world.regions?.length ? world.regions : DEFAULT_REGIONS,
    loadCenter: world.loadCenter ?? { chunkX: 0, chunkY: 0 },
    loadRadius: typeof world.loadRadius === "number" ? world.loadRadius : 1
  };
}

export function validateRegionBoundaries(world: WorldState) {
  const normalized = normalizeWorldState(world);
  const issues = normalized.structures
    .filter((structure) => structure.state !== "removed")
    .map((structure) => {
      const region = normalized.regions.find((item) => item.regionId === structure.ownership.regionId);
      if (!region) {
        return {
          key: chunkKey(structure.chunkX, structure.chunkY),
          chunkX: structure.chunkX,
          chunkY: structure.chunkY,
          recordId: structure.recordId,
          pieceId: structure.pieceId,
          regionId: structure.ownership.regionId,
          ownerId: structure.ownership.ownerId,
          structureCount: 1,
          reason: "Region is not registered in the ownership boundary table."
        };
      }
      if (region.ownerId !== structure.ownership.ownerId) {
        return {
          key: chunkKey(structure.chunkX, structure.chunkY),
          chunkX: structure.chunkX,
          chunkY: structure.chunkY,
          recordId: structure.recordId,
          pieceId: structure.pieceId,
          regionId: structure.ownership.regionId,
          ownerId: structure.ownership.ownerId,
          structureCount: 1,
          reason: `Structure owner ${structure.ownership.ownerId} does not match region owner ${region.ownerId}.`
        };
      }
      if (!isChunkInsideRegion(region, structure.chunkX, structure.chunkY)) {
        return {
          key: chunkKey(structure.chunkX, structure.chunkY),
          chunkX: structure.chunkX,
          chunkY: structure.chunkY,
          recordId: structure.recordId,
          pieceId: structure.pieceId,
          regionId: structure.ownership.regionId,
          ownerId: structure.ownership.ownerId,
          structureCount: 1,
          reason: `Chunk ${chunkKey(structure.chunkX, structure.chunkY)} is outside region ${region.regionId} bounds.`
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  return [...issues, ...validateChunkOwnershipConsistency(normalized)];
}

export function summarizeSettlements(world: WorldState): SettlementSummary[] {
  const normalized = normalizeWorldState(world);
  const active = normalized.structures.filter((structure) => structure.state !== "removed");
  const connectivityIssues = validateSettlementConnectivity(normalized);
  const requirementIssues = validateBuildRequirements(normalized);
  const summaries = new Map<string, SettlementSummary>();

  for (const structure of active) {
    const settlementId = structure.ownership.settlementId || structure.ownership.ownerId || "unassigned";
    const current =
      summaries.get(settlementId) ||
      ({
        settlementId,
        ownerId: structure.ownership.ownerId,
        chunkCount: 0,
        structureCount: 0,
        dirtyChunkCount: 0,
        roadChunkCount: 0,
        connectivityIssueCount: 0,
        requirementIssueCount: 0,
        structureTypes: {}
      } satisfies SettlementSummary);

    current.structureCount += 1;
    current.structureTypes[structure.pieceId] = (current.structureTypes[structure.pieceId] || 0) + 1;
    summaries.set(settlementId, current);
  }

  for (const summary of summaries.values()) {
    const structures = active.filter((structure) => (structure.ownership.settlementId || structure.ownership.ownerId || "unassigned") === summary.settlementId);
    const chunkKeys = new Set(structures.map((structure) => chunkKey(structure.chunkX, structure.chunkY)));
    const roadChunkKeys = new Set(structures.filter((structure) => structure.pieceId === "RoadMarker").map((structure) => chunkKey(structure.chunkX, structure.chunkY)));
    summary.chunkCount = chunkKeys.size;
    summary.roadChunkCount = roadChunkKeys.size;
    summary.dirtyChunkCount = normalizeWorldState(normalized).dirtyChunks.filter((chunk) => chunkKeys.has(chunk.key)).length;
    summary.connectivityIssueCount = connectivityIssues.filter((issue) => {
      const issueStructure = active.find((structure) => structure.recordId === issue.recordId);
      return issueStructure && (issueStructure.ownership.settlementId || issueStructure.ownership.ownerId || "unassigned") === summary.settlementId;
    }).length;
    summary.requirementIssueCount = requirementIssues.filter((issue) => {
      const issueStructure = active.find((structure) => structure.recordId === issue.recordId);
      return issueStructure && (issueStructure.ownership.settlementId || issueStructure.ownership.ownerId || "unassigned") === summary.settlementId;
    }).length;
  }

  return [...summaries.values()].sort((a, b) => b.structureCount - a.structureCount || a.settlementId.localeCompare(b.settlementId));
}

export function validateSettlementConnectivity(world: WorldState): SettlementConnectivityIssue[] {
  const normalized = normalizeWorldState(world);
  const active = normalized.structures.filter((structure) => structure.state !== "removed");
  const roadAndConnectorKeys = new Set(
    active
      .filter((structure) => structure.pieceId === "RoadMarker" || structure.pieceId === "Gate" || structure.pieceId === "Door")
      .map((structure) => worldTileKey(normalized, structure))
  );
  const roadChunkKeys = new Set(
    active
      .filter((structure) => structure.pieceId === "RoadMarker")
      .map((structure) => chunkKey(structure.chunkX, structure.chunkY))
  );

  if (!active.length) return [];
  if (!roadChunkKeys.size) {
    return active
      .filter((structure) => structure.pieceId !== "Floor")
      .map((structure) => toConnectivityIssue(normalized, structure, "blocked", "No road markers exist, so settlement access cannot be validated."));
  }

  return active
    .filter((structure) => shouldRequirePathConnection(structure.pieceId))
    .filter((structure) => !isNearRoadOrConnector(normalized, structure, roadAndConnectorKeys, roadChunkKeys))
    .map((structure) =>
      toConnectivityIssue(
        normalized,
        structure,
        structure.pieceId === "Gate" || structure.pieceId === "Door" ? "blocked" : "warning",
        `${structure.pieceId} is not adjacent to a road marker, gate, or door connector.`
      )
    );
}

export function validateBuildRequirements(world: WorldState): BuildRequirementIssue[] {
  const normalized = normalizeWorldState(world);
  const active = normalized.structures.filter((structure) => structure.state !== "removed");
  const issues: BuildRequirementIssue[] = [];

  for (const structure of active) {
    const neighbors = getNeighborStructures(normalized, structure, active);
    const sameChunk = active.filter((item) => item.chunkX === structure.chunkX && item.chunkY === structure.chunkY);

    if ((structure.pieceId === "Wall" || structure.pieceId === "WindowWall") && !sameChunk.some((item) => item.pieceId === "Floor" || item.pieceId === "RoadMarker")) {
      issues.push(
        toRequirementIssue(
          structure,
          "support",
          "warning",
          `${structure.pieceId} has no floor or road marker in the same chunk to represent basic site support.`
        )
      );
    }

    if (structure.pieceId === "Door" && !neighbors.some((item) => item.pieceId === "Wall" || item.pieceId === "WindowWall")) {
      issues.push(toRequirementIssue(structure, "wall_anchor", "blocked", "Door must be adjacent to a wall or window wall anchor."));
    }

    if (structure.pieceId === "Gate" && !neighbors.some((item) => item.pieceId === "Fence")) {
      issues.push(toRequirementIssue(structure, "boundary_anchor", "blocked", "Gate must be adjacent to a fence boundary anchor."));
    }

    if ((structure.pieceId === "Door" || structure.pieceId === "Gate") && !neighbors.some((item) => item.pieceId === "RoadMarker")) {
      issues.push(toRequirementIssue(structure, "road_access", "warning", `${structure.pieceId} has no adjacent road marker for settlement access.`));
    }
  }

  return issues;
}

function markChunkDirty(world: WorldState, chunkX: number, chunkY: number, reason: DirtyChunkRecord["reason"], changedAt: string): DirtyChunkRecord[] {
  const normalized = normalizeWorldState(world);
  const key = chunkKey(chunkX, chunkY);
  const existing = normalized.dirtyChunks.find((chunk) => chunk.key === key);
  const record: DirtyChunkRecord = {
    key,
    chunkX,
    chunkY,
    reason,
    dirtySince: existing?.dirtySince ?? changedAt,
    lastChangedAt: changedAt
  };
  return [...normalized.dirtyChunks.filter((chunk) => chunk.key !== key), record].sort((a, b) => a.chunkY - b.chunkY || a.chunkX - b.chunkX);
}

function isChunkDirty(world: WorldState, chunkX: number, chunkY: number) {
  return Boolean(getChunkDirtyRecord(world, chunkX, chunkY));
}

function getChunkDirtyRecord(world: WorldState, chunkX: number, chunkY: number) {
  const key = chunkKey(chunkX, chunkY);
  return normalizeWorldState(world).dirtyChunks.find((chunk) => chunk.key === key);
}

function isChunkAllowedForRegion(world: WorldState, regionId: string, ownerId: string, chunkX: number, chunkY: number) {
  const region = normalizeWorldState(world).regions.find((item) => item.regionId === regionId);
  if (!region) return false;
  if (region.ownerId !== ownerId) return false;
  return isChunkInsideRegion(region, chunkX, chunkY);
}

function isChunkOwnershipCompatible(world: WorldState, chunkX: number, chunkY: number, ownerId: string, regionId: string) {
  const active = normalizeWorldState(world).structures.filter((structure) => structure.state !== "removed" && structure.chunkX === chunkX && structure.chunkY === chunkY);
  if (!active.length) return true;
  return active.every((structure) => structure.ownership.ownerId === ownerId && structure.ownership.regionId === regionId);
}

function validateChunkOwnershipConsistency(world: WorldState) {
  return summarizeChunks(world)
    .map((chunk) => {
      const active = normalizeWorldState(world).structures.filter((structure) => structure.state !== "removed" && structure.chunkX === chunk.chunkX && structure.chunkY === chunk.chunkY);
      const ownerRegionPairs = new Set(active.map((structure) => `${structure.ownership.ownerId}::${structure.ownership.regionId}`));
      if (ownerRegionPairs.size <= 1) return null;
      return {
        key: chunk.key,
        chunkX: chunk.chunkX,
        chunkY: chunk.chunkY,
        regionId: chunk.regionId,
        ownerId: chunk.ownerId,
        structureCount: active.length,
        reason: `Chunk ${chunk.key} contains mixed owner/region metadata. Expected one owner/region per chunk, found ${ownerRegionPairs.size}.`
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);
}

function isChunkInsideRegion(region: RegionBoundary, chunkX: number, chunkY: number) {
  return chunkX >= region.minChunkX && chunkX <= region.maxChunkX && chunkY >= region.minChunkY && chunkY <= region.maxChunkY;
}

function buildLoadWindowChunkKeys(center: { chunkX: number; chunkY: number }, radius: number) {
  const keys: string[] = [];
  for (let chunkY = center.chunkY - radius; chunkY <= center.chunkY + radius; chunkY += 1) {
    for (let chunkX = center.chunkX - radius; chunkX <= center.chunkX + radius; chunkX += 1) {
      keys.push(chunkKey(chunkX, chunkY));
    }
  }
  return keys;
}

function countRoadNetworkChunks(world: WorldState) {
  const normalized = normalizeWorldState(world);
  return new Set(
    normalized.structures
      .filter((structure) => structure.state !== "removed" && structure.pieceId === "RoadMarker")
      .map((structure) => chunkKey(structure.chunkX, structure.chunkY))
  ).size;
}

function shouldRequirePathConnection(pieceId: StructureKind) {
  return pieceId === "Wall" || pieceId === "WindowWall" || pieceId === "Door" || pieceId === "Fence" || pieceId === "Gate";
}

function isNearRoadOrConnector(world: WorldState, structure: PlacedStructure, connectorKeys: Set<string>, roadChunkKeys: Set<string>) {
  if (roadChunkKeys.has(chunkKey(structure.chunkX, structure.chunkY)) && structure.pieceId !== "Gate") return true;
  const keys = neighboringWorldTileKeys(world, structure.chunkX, structure.chunkY, structure.tileX, structure.tileY);
  return keys.some((key) => connectorKeys.has(key));
}

function neighboringWorldTileKeys(world: WorldState, chunkX: number, chunkY: number, tileX: number, tileY: number) {
  const offsets = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 }
  ];
  return offsets.map((offset) => {
    const absoluteX = chunkX * world.chunkSizeTiles + tileX + offset.x;
    const absoluteY = chunkY * world.chunkSizeTiles + tileY + offset.y;
    return `${absoluteX},${absoluteY}`;
  });
}

function worldTileKey(world: WorldState, structure: Pick<PlacedStructure, "chunkX" | "chunkY" | "tileX" | "tileY">) {
  return `${structure.chunkX * world.chunkSizeTiles + structure.tileX},${structure.chunkY * world.chunkSizeTiles + structure.tileY}`;
}

function toConnectivityIssue(world: WorldState, structure: PlacedStructure, severity: SettlementConnectivityIssue["severity"], reason: string): SettlementConnectivityIssue {
  return {
    key: chunkKey(structure.chunkX, structure.chunkY),
    chunkX: structure.chunkX,
    chunkY: structure.chunkY,
    tileX: structure.tileX,
    tileY: structure.tileY,
    recordId: structure.recordId,
    pieceId: structure.pieceId,
    severity,
    reason
  };
}

function getNeighborStructures(world: WorldState, structure: PlacedStructure, activeStructures: PlacedStructure[]) {
  const neighborKeys = new Set(neighboringWorldTileKeys(world, structure.chunkX, structure.chunkY, structure.tileX, structure.tileY).filter((key) => key !== worldTileKey(world, structure)));
  return activeStructures.filter((item) => item.recordId !== structure.recordId && neighborKeys.has(worldTileKey(world, item)));
}

function toRequirementIssue(
  structure: PlacedStructure,
  requirement: BuildRequirementIssue["requirement"],
  severity: BuildRequirementIssue["severity"],
  reason: string
): BuildRequirementIssue {
  return {
    key: chunkKey(structure.chunkX, structure.chunkY),
    chunkX: structure.chunkX,
    chunkY: structure.chunkY,
    tileX: structure.tileX,
    tileY: structure.tileY,
    recordId: structure.recordId,
    pieceId: structure.pieceId,
    requirement,
    severity,
    reason
  };
}
