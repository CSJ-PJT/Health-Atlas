# DeepStake Web Prototype

DeepStake Web Prototype is a browser-based systems lab for DeepStake3D.

It is **not** a replacement for Unity. Unity remains the final game client. This prototype validates chunk-world, settlement, persistence, ownership, and diagnostic logic before those systems are implemented fully in Unity.

## Phase 1 Scope

- Chunk-based world grid with visible chunk coordinates
- Construction simulation: place, rotate, remove
- Settlement view grouped by chunk
- JSON save/load persistence
- Chunk diagnostics and occupied chunk list
- Ownership metadata foundation
- Region boundary validation
- Chunk ownership transfer simulation
- Developer dashboard for world, chunk, and settlement statistics
- Dirty chunk tracking
- Chunk save batch preview
- Load/unload radius simulation
- Road/path connectivity diagnostics for settlement rule validation
- Build requirement diagnostics for support, anchor, and road-access checks
- Settlement summaries by owner/chunk/road/dirty/validation state

## Architecture

```text
apps/deepstake-web-prototype/
  src/app/
    page.tsx              Developer dashboard and simulation viewer
    api/world/route.ts    Node/TypeScript JSON persistence API
    globals.css           Simple debug/admin dashboard styling
  src/lib/
    types.ts              Shared world/chunk/structure types
    world.ts              Simulation logic and diagnostics
    persistence.ts        Local JSON read/write
  data/
    world-state.json      Local generated persistence file
```

## Data Model

The model intentionally mirrors Unity ModularConstructionPrototype concepts:

- `recordId`
- `pieceId`
- `chunkX`, `chunkY`
- `tileX`, `tileY`
- `rotation`
- `state`
- `durability`
- `footprintWidth`, `footprintDepth`
- `ownership.ownerId`
- `ownership.regionId`
- `ownership.settlementId`

## Chunk Model

- Chunks are identified by `{ chunkX, chunkY }`.
- Each chunk is 8x8 local tiles in Phase 1.
- Structures are stored as records and grouped by chunk at runtime.
- Diagnostics summarize occupied chunks, occupied tiles, structure types, owners, and damaged/removed counts.
- Dirty chunks are tracked after place, rotate, remove, and seeded import operations.
- Save batches group dirty chunks in small fixed-size batches for future storage adapters.
- Load/unload simulation shows the full loaded chunk window, empty loaded slots, occupied chunks inside the radius, and occupied chunks outside the radius.
- Region boundary validation prevents new placements from using unregistered or out-of-bounds ownership metadata.
- Chunk ownership transfer updates existing chunk records only when the target region owns and contains the chunk.
- Settlement connectivity validation flags structures that are not adjacent to a road marker, gate, or door connector.
- Build requirement validation flags unsupported walls, unanchored doors/gates, and missing road access without adding crafting or economy.
- Settlement diagnostics summarize each settlement's chunks, road coverage, dirty chunks, and validation issues.

## Persistence Model

Phase 1 uses local JSON:

```text
apps/deepstake-web-prototype/data/world-state.json
```

The API is intentionally thin so it can later migrate to PostgreSQL, Supabase, or another database without changing the client simulation model.

## Ownership Model

Ownership is metadata-only in Phase 1:

- `ownerId`
- `ownerType`
- `regionId`
- optional `settlementId`
- static region bounds
- chunk ownership transfer simulation

No economy, permissions, multiplayer, or authentication are implemented.

## Development Roadmap

### Milestone 1: Phase 1 Foundation

- Create world grid
- Place, rotate, remove structures
- Save/load JSON world state
- Show chunk diagnostics
- Show settlement grouping by chunk
- Preserve Unity-oriented record shape

### Milestone 2: Chunk Lifecycle

- Dirty chunk tracking
- Save batching
- Load/unload radius simulation
- Chunk ownership transfer checks
- Settlement diagnostics
- API smoke validation

Status: implemented in the web prototype as the Chunk World Foundation M2 layer.

### Milestone 3: Settlement Rules

- Road/path connectivity diagnostics
- Structure requirement diagnostics
- Settlement boundary validation
- Large settlement scenarios

### Milestone 4: Database Migration Prep

- Repository interface
- Storage adapters
- Migration validation
- Snapshot import/export

## Run Locally

```bash
npm install
npm run dev:deepstake-web
```

Open:

```text
http://localhost:3090
```

Run the world API smoke test while the dev server is running:

```bash
npm run test:deepstake-web
```

## ngrok Mobile Access

After the dev server is running:

```bash
ngrok http 3090
```

Open the generated HTTPS forwarding URL on your phone.

## Explicitly Forbidden in Phase 1

- Combat
- Quests
- NPC AI
- Economy systems
- Multiplayer
- Authentication
- Korean art assets
- Visual polish
- Mobile optimization
