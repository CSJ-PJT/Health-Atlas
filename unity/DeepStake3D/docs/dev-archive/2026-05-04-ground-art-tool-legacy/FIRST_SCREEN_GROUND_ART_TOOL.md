# First Screen Ground Art Tool

## What this tool does

This tool regenerates the first-screen ground art for `WorldPrototype3D` from gameplay anchors instead of manual tile painting.

It creates a single deterministic hierarchy:

- `GeneratedGroundArt`
  - `BaseTerrain`
  - `MainPath`
  - `NoticePlaza`
  - `PlayerPocket`
  - `BuildingYards`
  - `StorageYard`
  - `RecoveryField`
  - `EdgeFill`
  - `ContactShadows`

The tool only rebuilds generated ground art. It does not move gameplay objects, NPCs, interactables, or placement zones.

## How to run it

1. Open the scene that contains `WorldPrototype3DController`.
2. In the Unity menu, run:
   - `DeepStake > First Screen Art > Generate Ground Art`
3. If you want to remove only generated ground art, run:
   - `DeepStake > First Screen Art > Clear Generated Ground Art`
4. If you want a fresh comparison screenshot, run:
   - `DeepStake > First Screen Art > Capture Comparison Screenshot`

## What to inspect

Look at the first visible gameplay screen and confirm:

- the player start area reads clearly
- the route to the notice board reads as one path
- the notice board feels like a first destination
- building fronts feel grounded
- there are fewer prototype-like flat planes

Recommended screenshot to compare:

- `unity/DeepStake3D/Pictures/Screenshot/local-ground-art-tooling.png`

## Parameters you can safely adjust

Edit:

- `unity/DeepStake3D/Assets/Resources/Configs/first-screen-ground-art-config.json`

Safe fields to adjust:

- `pathWidth`
- `noticePlazaWidth`
- `noticePlazaDepth`
- `playerPocketWidth`
- `playerPocketDepth`
- `playerPocketClearWidth`
- `playerPocketClearDepth`
- `buildingYardWidth`
- `buildingYardDepth`
- `storageYardWidth`
- `storageYardDepth`
- `recoveryFieldWidth`
- `recoveryFieldDepth`
- `rightUpperFieldWidth`
- `rightUpperFieldDepth`
- `rightSettlementWidth`
- `rightSettlementDepth`
- `contactShadowOpacity`

Material name mappings are also in the same config file.

## Material palette location

When the generator runs in the editor, it creates or updates materials here:

- `unity/DeepStake3D/Assets/Materials/FirstScreenGroundArt`

These are intended as reusable muted palette materials, not final hand-authored art.

## What not to touch

Do not manually move or delete unrelated gameplay objects under the scene root.

Do not edit:

- interactable transforms
- NPC transforms
- placement zone gameplay objects
- save/load logic
- UI prompt flow

If ground art looks wrong, change the config or rerun the generator instead of manually painting over random pieces.

## Safe regeneration workflow

1. Run `Generate Ground Art`
2. Enter Play Mode or use the local screenshot workflow
3. Compare the new screenshot
4. If needed, change only the config values
5. Run `Generate Ground Art` again

This keeps the first-screen art iteration data-driven instead of manual.
