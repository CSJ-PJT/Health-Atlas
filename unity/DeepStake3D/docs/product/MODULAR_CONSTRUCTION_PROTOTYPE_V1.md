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
- right click or `Delete`: remove the top piece at the hovered tile
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
  durability
}
```

Placed pieces are saved to:

```text
Application.persistentDataPath/DeepStake3D/modular-construction-prototype.json
```

On scene load, the prototype restores this file when it exists. If no save file exists, the demo footprint is spawned.

## Large-World Readiness

V1 does not implement streaming. It does prepare:

- global tile coordinate
- chunk coordinate
- local tile coordinate inside chunk
- piece id
- rotation
- state placeholder
- durability placeholder

Future work can add:

- chunk load/unload
- dismantle/salvage/repair states
- material requirements
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
- no dismantle/salvage/repair
- no collision validation beyond same-piece duplicate blocking
- no material costs
- no multiplayer or NPC construction behavior
- no roof/cutaway system
