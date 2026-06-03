# Modular Construction Prototype V1

## Purpose

This prototype is the new real-game foundation path for DeepStake3D. It is isolated from `WorldPrototype3D.unity` and exists to prove that DeepStake can become a player-modifiable, chunk-ready, real-scale modular construction game.

It is not a screenshot decoration pass.

## Scene

`Assets/Scenes/ModularConstructionPrototype.unity`

The scene contains a single runtime controller. On play, it creates:

- a 32m x 32m prototype chunk ground plane
- a 1.75m scale-reference player capsule
- a real-scale test building footprint
- floor, wall, corner, door frame, door, window wall, fence, and gate pieces
- an orthographic quarter-view camera
- a directional light if one is not present

## Scale Rules

- 1 Unity unit = 1 meter
- character reference height = 1.75m
- wall height = 2.8m
- door height = 2.1m
- door width = 0.9m
- floor module = 2m x 2m
- fence height = 1.4m
- gate height = 1.6m

Buildings must stay believable beside the player. Do not shrink buildings for camera convenience.

## Controls

- `1`: floor tile
- `2`: wall segment
- `3`: corner wall
- `4`: door frame
- `5`: door
- `6`: window wall
- `7`: fence
- `8`: gate
- `[` / `]`: cycle piece type
- `R`: rotate 90 degrees
- left click: place
- right click or `Delete`: dismantle/remove the top piece at the hovered tile
- `Z`: damage the top piece at the hovered tile
- `X`: repair the top piece at the hovered tile
- `F5`: save placed modular construction pieces
- `F9`: load placed modular construction pieces

## Data Model

The core record is:

```csharp
PlacedBuildPiece {
  recordId,
  pieceId,
  chunkX,
  chunkY,
  tileX,
  tileY,
  footprintWidthTiles,
  footprintDepthTiles,
  rotation,
  state,
  durability,
  resourceCostKey,
  resourceCostUnits,
  buildRequirementKey,
  buildRequirementSatisfied
}
```

Placed pieces are saved to:

```text
Application.persistentDataPath/DeepStake3D/modular-construction-prototype.json
```

On scene load, the prototype restores this file when it exists. If no save file exists, the demo footprint is spawned.

The save payload keeps the flat `pieces` list for compatibility and also writes `chunks` with their nested `tiles` and piece records. Loading still prefers the flat list when present, then falls back to chunk records for future chunk-first saves.

## Placement Rules

V1 uses the existing chunk/tile/placed-piece records as the source of truth. Runtime visuals are spawned from those records.

Each build piece has simple rule metadata:

- category: `floor`, `wall`, `opening`, `door`, `fence`, or `gate`
- footprint tiles
- occupancy compatibility

Current rule behavior:

- floor pieces cannot overlap another floor piece
- floor pieces may coexist with one vertical structural piece as an explicit foundation layer
- wall, window wall, fence, and gate pieces cannot overlap another incompatible structural piece
- doors may coexist with door frames
- door frames may coexist with doors
- dismantling the top piece clears that piece from every occupied chunk/tile record
- load rejects saved records that fail the same occupancy validation against already-restored records

This is still a prototype rule set, not a full building-code system.

## Durability State Flow

Placed build pieces use the existing `state` and `durability` fields.

Current debug flow:

- new pieces start as `built` with durability `100`
- `Z` changes the top hovered piece to `damaged` and reduces durability
- `X` changes the top hovered piece to `repaired` and restores durability to `100`
- right click or `Delete` dismantles/removes the top hovered piece from the records
- save/load preserves state and durability for placed pieces

This is not inventory-backed crafting yet. Dismantled pieces are removed rather than converted into resources.

## Resource Cost Placeholder

Placed build pieces snapshot lightweight placeholder cost metadata from their construction definition:

- `resourceCostKey`: a future-facing material bucket such as `wall_material` or `gate_material`
- `resourceCostUnits`: a simple integer cost weight

This is intentionally not an inventory, crafting, or economy system. The values exist so future construction requirements can read stable saved records without changing the chunk/tile model.

## Build Requirement Placeholder

Placed build pieces also snapshot non-blocking requirement metadata:

- `buildRequirementKey`: a future-facing requirement bucket such as `basic_construction`, `opening_construction`, or `boundary_construction`
- `buildRequirementSatisfied`: currently `true` for prototype placements

The prototype does not check skills, quests, inventory, ownership, or settlement permissions. Requirement fields only reserve stable save data for future validation layers.

## Large-World Readiness

V1 does not implement streaming. It does prepare:

- global tile coordinate
- chunk coordinate
- local tile coordinate inside chunk
- piece id
- rotation
- state
- durability
- resource cost placeholder
- build requirement placeholder

Future work can add:

- chunk load/unload
- salvage/resource returns
- inventory-backed material requirements
- ownership/settlement permissions
- dimension-specific construction rules

## Camera And Visibility Strategy

V1 does not solve cutaway. The intended future strategy is:

- hide roofs when the player enters
- fade camera-facing walls
- outline player through occluding walls
- keep real-sized walls and doors
- never shrink buildings to solve visibility

## Meshy / Generated Asset Policy

Existing generated assets remain useful, but they are not the construction foundation.

Classification:

- A. Modular construction candidate: doors, windows, wall trims, fences only if they fit exact grid scale.
- B. Authority/civic prop: notice boards, reporting boards, lamps.
- C. Boundary/control prop: fences, gates, route markers.
- D. Survival/lived-in prop: crates, barrels, sacks, benches.
- E. Background-only: trees, skyline silhouettes, non-interactive dressing.
- F. Reject/quarantine: comedic props, cats, modern cafe/house assets, broken-scale objects, unreadable AI-text props.

V1 uses primitive modular pieces because structure and scale matter more than asset beauty.

## Missing After V1

- no inventory
- no crafting
- no chunk streaming
- no salvage/resource return
- no full structural support or stability simulation
- no inventory-backed material costs
- no multiplayer or NPC construction behavior
- no roof/cutaway system
