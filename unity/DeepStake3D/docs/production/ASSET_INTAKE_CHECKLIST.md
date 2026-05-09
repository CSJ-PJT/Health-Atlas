# Asset Intake Checklist

This checklist defines the current DeepStake3D first-screen asset intake policy. It replaces the older primitive ground-art workflow.

## Scope

Use this checklist for Meshy models, curated environment props, and PBR runtime textures for the current `WorldPrototype3D` scene.

Do not use this checklist to redesign the map, move gameplay anchors, or reintroduce generated primitive ground-art passes.

## Required Asset Categories

- Building detail modules: doors, windows, porch modules, awnings, trims.
- Utility props: crates, barrels, water tanks, generators, lamps, signposts.
- Boundary props: fences, low walls, small blockers, edge silhouettes.
- Vegetation: low-count trees, shrubs, background silhouettes.
- PBR runtime textures: ground, walls, roofs, props, decals/overlays.

## Source And Commit Policy

- Do not commit raw ZIPs unless explicitly approved.
- Do not commit extracted source originals unless explicitly approved.
- Keep third-party/raw assets outside normal commits.
- Keep screenshots, `TestResults`, `_ExternalAssetInbox`, `_Recovery`, and generated performance files out of commits.
- Do not touch or include `unity/DeepStakeUnity/*`.

## Folder Policy

Curated runtime models:

```text
unity/DeepStake3D/Assets/DeepStake/Models/Environment/<Category>/<assetId>/
```

Generated prefabs:

```text
unity/DeepStake3D/Assets/DeepStake/Prefabs/Environment/<Category>/<assetId>.prefab
```

Meshy registry:

```text
unity/DeepStake3D/Assets/Resources/Meshy/deepstake_meshy_model_registry.json
```

Meshy placement mapping:

```text
unity/DeepStake3D/Assets/Resources/Meshy/deepstake_meshy_placement_mapping.json
```

PBR material library, scene mapping, and runtime texture slots:

```text
unity/DeepStake3D/Assets/Resources/PBR/
```

Third-party source originals, if temporarily needed:

```text
unity/DeepStake3D/_ExternalAssetInbox/
```

## Naming Conventions

- Use stable lowercase `assetId` values, for example `prop_supply_crate`.
- Match model folder, prefab, and registry `assetId`.
- Use category folders already present in the registry, such as `BuildingModular`, `Props`, `PropsModular`, and `Vegetation`.
- Avoid names like `New`, `Temp`, `Variant 1`, or provider-specific random names in curated runtime paths.

## Import Quality Bar

- Asset must read clearly from the existing quarter-view camera.
- Asset must improve silhouette or material identity without adding clutter.
- No neon, lime green, overly saturated, or unreadable noisy materials.
- No readable real-world text dependency.
- Scale and pivot must be reasonable enough for prefab placement.
- Materials must not show pink/missing shaders.
- Texture sizes should be reasonable for runtime use.

## Meshy Intake Steps

1. Put incoming ZIPs outside active commit scope.
2. Extract or quarantine raw source outside normal runtime folders.
3. Copy only curated runtime model and needed textures into `Assets/DeepStake/Models/Environment/`.
4. Prefer GLB over FBX when both exist and Unity imports it cleanly.
5. Create prefabs only after import validation succeeds.
6. Update `deepstake_meshy_model_registry.json` with the correct status.
7. Do not place assets in the scene until the placement pass is explicitly approved.

## PBR Texture Intake Steps

1. Keep third-party originals out of `Assets/Resources`.
2. Copy only optimized runtime textures into `Assets/Resources/PBR/Textures/Environment/`.
3. Preserve locked runtime filenames for approved slots.
4. Keep material library and scene mapping changes separate from model placement changes.
5. Do not add new PBR slots without explicit approval.

## Gameplay Separation Rules

- Preserve player spawn, interaction anchors, quest triggers, camera, and map footprint.
- If a gameplay object needs a visual replacement, keep the gameplay root and replace only the visual child.
- Do not move gameplay anchors to fit art.
- Do not modify gameplay logic during asset intake.

## Screenshot And Validation Policy

- Screenshot validation is required before committing visual placement changes.
- If screenshot automation is blocked by environment issues, checkpoint only after compile/open validation and clearly label screenshot status.
- Do not commit screenshots or `TestResults`.
- Do not use stale screenshots as approval evidence.

## First-Screen Dressing Order

1. Ground/path readability.
2. Notice landmark.
3. Building fronts and entrances.
4. Boundary blockers.
5. Low-count props.
6. Lighting/camera readability.

## User Decision Required Before Implementation

- Free-only vs paid allowed.
- Selected asset source or provider.
- Manual placement allowed yes/no.
- Keep stylized low-poly direction yes/no.
- Whether to proceed with Meshy model placement, PBR texture intake, or both.

