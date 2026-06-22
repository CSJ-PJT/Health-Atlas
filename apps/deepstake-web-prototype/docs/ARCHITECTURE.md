# DeepStake Web Prototype Architecture Proposal

## 1. Purpose

DeepStake Web Prototype is a browser-based systems lab for DeepStake3D.

It does not replace the Unity client. Unity remains the final game client. The web prototype exists to validate world-simulation logic faster than a full Unity iteration loop:

- chunk grouping
- settlement-scale construction data
- local persistence
- dirty chunk tracking
- chunk save batching
- ownership metadata
- region boundary validation
- load/unload radius behavior
- road/path connectivity diagnostics
- settlement summaries
- API smoke validation

The UI intentionally looks like developer tooling: an admin/debug dashboard rather than a production game UI.

## 2. Current Repository Structure

```text
apps/deepstake-web-prototype/
  package.json
  next.config.mjs
  tsconfig.json
  README.md
  docs/
    ARCHITECTURE.md
  src/
    app/
      layout.tsx
      page.tsx
      globals.css
      api/
        world/
          route.ts
    lib/
      types.ts
      world.ts
      persistence.ts
  data/
    world-state.json
```

Generated files are excluded:

- `.next/`
- `data/*.json`
- `tsconfig.tsbuildinfo`

## 3. Runtime Architecture

```text
Browser UI
  |
  | fetch /api/world
  v
Next.js API Route
  |
  | load/save JSON
  v
Local world-state.json
```

Phase 1 keeps the stack deliberately small:

- Next.js + React + TypeScript frontend
- Next.js API route as Node.js backend
- Local JSON persistence
- No authentication
- No multiplayer
- No economy
- No NPC AI

This keeps iteration fast while preserving a clean migration path to a database later.

## 4. Data Model Proposal

The web model mirrors Unity ModularConstructionPrototype records so logic can be ported later.

### WorldState

```ts
type WorldState = {
  schemaVersion: 1;
  worldId: string;
  chunkSizeTiles: number;
  nextRecordId: number;
  structures: PlacedStructure[];
  dirtyChunks: DirtyChunkRecord[];
  regions: RegionBoundary[];
  loadCenter: ChunkCoord;
  loadRadius: number;
  updatedAt: string;
};
```

### PlacedStructure

```ts
type PlacedStructure = {
  recordId: number;
  pieceId: StructureKind;
  chunkX: number;
  chunkY: number;
  tileX: number;
  tileY: number;
  rotation: 0 | 90 | 180 | 270;
  state: "built" | "damaged" | "removed";
  durability: number;
  footprintWidth: number;
  footprintDepth: number;
  ownership: OwnershipMetadata;
  createdAt: string;
  updatedAt: string;
};
```

## 5. Chunk Model Design

- Chunk coordinate: `{ chunkX, chunkY }`
- Tile coordinate inside chunk: `{ tileX, tileY }`
- Chunk size: `8 x 8` tiles in Phase 1
- Source of truth: record data, not rendered objects
- Runtime views derive:
  - chunk summary
  - occupied chunk list
  - save batches
  - load/unload sets
  - boundary violations
  - connectivity issues
  - settlement summaries

The model intentionally supports negative chunks so later world expansion can grow in all directions.

## 6. Persistence Model Design

Phase 1 persistence:

```text
apps/deepstake-web-prototype/data/world-state.json
```

The persistence boundary is intentionally narrow:

```ts
loadWorldState(): Promise<WorldState>
saveWorldState(world): Promise<WorldState>
```

This is prepared for a later storage adapter:

```text
WorldRepository
  JsonWorldRepository
  PostgresWorldRepository
  SupabaseWorldRepository
```

No database is introduced yet because the immediate goal is systems validation, not production operations.

## 7. Ownership Model Design

Ownership is metadata-only:

```ts
type OwnershipMetadata = {
  ownerId: string;
  ownerType: "system" | "settlement" | "player" | "faction";
  regionId: string;
  settlementId?: string;
};
```

Region boundaries are static in Phase 1. They validate whether a chunk belongs to the requested region/owner before placement or transfer.

Ownership transfer is a simulation:

- updates metadata on structures inside a chunk
- marks the chunk dirty
- refuses transfer if region owner or boundary does not match

It does not implement economy, permissions, diplomacy, multiplayer, or claims.

## 8. Current Milestone Breakdown

### Milestone 1: World Simulation Foundation

Implemented:

- chunk grid
- visual chunk coordinates
- place / rotate / remove
- settlement view grouped by chunk
- JSON save/load
- diagnostics dashboard
- ownership metadata

### Milestone 1.5: Chunk Lifecycle Foundation

Implemented:

- dirty chunk tracking
- chunk save batching preview
- load/unload radius simulation
- region boundary validation
- chunk ownership transfer simulation
- settlement-level diagnostics
- API smoke test for persistence, dirty chunks, save batches, ownership, and lifecycle fields

### Milestone 2: Settlement Rule Foundation

In progress:

- road/path connectivity validation

Recommended next:

- structure requirement placeholders
- settlement boundary scenario tests
- chunk import/export diagnostics

### Milestone 3: Database Migration Readiness

Recommended later:

- repository interface
- storage adapter tests
- JSON snapshot import/export
- Supabase/PostgreSQL schema prototype

## 9. Estimated Implementation Order

1. Stabilize current Phase 1.5 prototype and commit it.
2. Expand road/path connectivity validation into settlement-scale scenarios.
3. Add settlement boundary scenario diagnostics.
4. Add structure requirement placeholders.
5. Add repository interface while keeping JSON as default.
6. Add migration-safe snapshot tests.

## 10. Risks

- The web model can drift from Unity if fields diverge.
- JSON persistence is not safe for concurrent writers.
- Region boundaries are static and hand-authored for now.
- No automated browser test exists yet.
- Current ngrok URL is shared with other local projects and may need switching.
- Existing repository contains unrelated Unity dirty files, so commit scope must be controlled carefully.

## 11. Recommended Next Task

Add Settlement Rule Foundation:

- road/path connectivity validation
- invalid isolated gate/path warning
- settlement boundary summary
- scenario seed for multiple connected structures

This remains inside system validation and does not introduce art, economy, NPCs, combat, quests, or multiplayer.
