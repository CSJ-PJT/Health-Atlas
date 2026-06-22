export type StructureKind = "Floor" | "Wall" | "Door" | "WindowWall" | "Fence" | "Gate" | "RoadMarker";

export type StructureState = "built" | "damaged" | "removed";

export type OwnerType = "system" | "settlement" | "player" | "faction";

export type Rotation = 0 | 90 | 180 | 270;

export type ChunkCoord = {
  chunkX: number;
  chunkY: number;
};

export type TileCoord = {
  tileX: number;
  tileY: number;
};

export type OwnershipMetadata = {
  ownerId: string;
  ownerType: OwnerType;
  regionId: string;
  settlementId?: string;
};

export type PlacedStructure = ChunkCoord &
  TileCoord & {
    recordId: number;
    pieceId: StructureKind;
    rotation: Rotation;
    state: StructureState;
    durability: number;
    footprintWidth: number;
    footprintDepth: number;
    ownership: OwnershipMetadata;
    createdAt: string;
    updatedAt: string;
  };

export type ChunkSummary = ChunkCoord & {
  key: string;
  ownerId: string;
  regionId: string;
  structureCount: number;
  occupiedTiles: number;
  damagedCount: number;
  dirty: boolean;
  lastChangedAt: string | null;
  structureTypes: Record<string, number>;
};

export type SettlementSummary = {
  settlementId: string;
  ownerId: string;
  chunkCount: number;
  structureCount: number;
  dirtyChunkCount: number;
  roadChunkCount: number;
  connectivityIssueCount: number;
  requirementIssueCount: number;
  structureTypes: Record<string, number>;
};

export type DirtyChunkRecord = ChunkCoord & {
  key: string;
  reason: "placed" | "removed" | "rotated" | "imported" | "seeded" | "ownership_transfer" | "advanced_day";
  dirtySince: string;
  lastChangedAt: string;
};

export type RegionBoundary = {
  regionId: string;
  label: string;
  ownerId: string;
  minChunkX: number;
  maxChunkX: number;
  minChunkY: number;
  maxChunkY: number;
};

export type BoundaryViolation = ChunkCoord & {
  key: string;
  recordId?: number;
  pieceId?: StructureKind;
  regionId: string;
  ownerId: string;
  reason: string;
  structureCount: number;
};

export type SettlementConnectivityIssue = ChunkCoord &
  TileCoord & {
    key: string;
    recordId: number;
    pieceId: StructureKind;
    severity: "warning" | "blocked";
    reason: string;
  };

export type BuildRequirementIssue = ChunkCoord &
  TileCoord & {
    key: string;
    recordId: number;
    pieceId: StructureKind;
    requirement: "support" | "wall_anchor" | "boundary_anchor" | "road_access";
    severity: "warning" | "blocked";
    reason: string;
  };

export type ChunkSaveBatch = {
  batchId: string;
  chunkKeys: string[];
  structureCount: number;
  estimatedBytes: number;
  createdAt: string;
};

export type ChunkLifecycleSimulation = {
  center: ChunkCoord;
  radius: number;
  loadWindowChunkKeys: string[];
  loadedChunkKeys: string[];
  emptyLoadedChunkKeys: string[];
  unloadedChunkKeys: string[];
  activeStructureCount: number;
};

export type WorldDiagnostics = {
  totalStructures: number;
  activeStructures: number;
  removedStructures: number;
  occupiedChunks: number;
  occupiedTiles: number;
  damagedStructures: number;
  dirtyChunks: number;
  saveBatchCount: number;
  loadRadius: number;
  boundaryViolations: number;
  connectivityIssues: number;
  requirementIssues: number;
  roadNetworkChunks: number;
  settlements: number;
  owners: Record<string, number>;
  structureTypes: Record<string, number>;
};

export type WorldState = {
  schemaVersion: 1;
  worldId: string;
  worldDay: number;
  chunkSizeTiles: number;
  nextRecordId: number;
  structures: PlacedStructure[];
  dirtyChunks: DirtyChunkRecord[];
  regions: RegionBoundary[];
  loadCenter: ChunkCoord;
  loadRadius: number;
  updatedAt: string;
};

export type WorldPayload = {
  world: WorldState;
  chunks: ChunkSummary[];
  settlements: SettlementSummary[];
  diagnostics: WorldDiagnostics;
  saveBatches: ChunkSaveBatch[];
  lifecycle: ChunkLifecycleSimulation;
  boundaryViolations: BoundaryViolation[];
  connectivityIssues: SettlementConnectivityIssue[];
  requirementIssues: BuildRequirementIssue[];
};
