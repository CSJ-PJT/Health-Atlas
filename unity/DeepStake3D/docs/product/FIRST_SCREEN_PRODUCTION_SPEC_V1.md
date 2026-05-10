# First Screen Production Spec V1

Source direction: Controlled Recovery Outpost.

Reference image: `unity/DeepStake3D/docs/product/reference-images/controlled-recovery-outpost-primary-reference.png`

This spec converts the selected reference direction into a production-ready blockout plan. It is not an implementation pass. It defines what the human should approve before Unity scene editing resumes.

## 1. Reference Image Analysis

### Emotional Tone

The reference reads as a controlled recovery settlement: organized, scarce, administrative, and socially tense. It is not overt monster horror. The unease comes from authority, waiting, reporting, and constrained movement.

The best parts of the reference are:

- The public notice board is the immediate power center.
- The route from player start to authority point is readable.
- Low buildings frame the scene without becoming a fantasy village.
- The environment feels inhabited but not comfortable.
- Scarcity is shown through worn materials, sparse storage, patched roofs, and controlled access.

### Authority / Control Feeling

Authority is expressed through the notice board, stairs/platform, lamps, fences, and sightline control. The board is central and elevated enough to feel official, but should not become a giant toy prop in Unity.

Production interpretation:

- Authority should come from composition first.
- Scale should support readability, not overwhelm the map.
- The notice board must be the first readable objective from the player start.

### Social Pressure

The reference implies people reporting, standing, waiting, trading, and obeying. NPCs are sparse, positioned along the path and near the authority board. The settlement feels socially managed rather than freely lived in.

Production interpretation:

- Use low NPC count.
- Place NPCs as pressure points, not crowd filler.
- Keep route clear enough for gameplay.

### Player Start Readability

The player start area is visible at the lower-left/lower-foreground edge. It is separated from the authority point by a clear walkable route. This creates an immediate "I start here, I go there" read.

Production interpretation:

- Player start must remain visually clean.
- Do not crowd the spawn area.
- The first route should be visible without camera movement.

### Route Guidance

The path is a worn stone/dirt route leading directly toward the notice board. Buildings and fences guide the eye.

Production interpretation:

- Route should be the brightest/readable ground shape after the authority landmark.
- Use path shape, building fronts, and fences to guide movement.
- Avoid random props along the path.

### Scarcity Feeling

Scarcity comes from muted color, patched surfaces, limited storage, dry ground, and controlled access. It does not come from junk piles.

Production interpretation:

- Use sparse, purposeful props.
- Avoid junk density.
- Reuse crates/barrels only where they imply rationing or work.

### Quarter-View Mobile Readability

The reference works because the hierarchy is clear even at reduced size: start area, path, notice board, buildings, boundary.

Production interpretation:

- Prefer large readable shapes over small facade detail.
- Avoid thin/low-contrast objects as key landmarks.
- Keep silhouettes separated.

### Landmark Hierarchy

Hierarchy should be:

1. Notice / authority board.
2. Player start area.
3. Main path.
4. Low settlement buildings.
5. Boundary / controlled edge.
6. Sparse support props.

### Controlled Recovery Settlement Fit

The reference fits the PM brief well. It communicates familiar settlement structure, but the social logic is uncomfortable: the outpost is run by reporting and compliance.

## 2. First-Screen Success Criteria

### What Player Must Feel In First 5 Seconds

- "I am entering a controlled recovery settlement."
- "The notice board or reporting point is important."
- "This place is functional, but socially uncomfortable."
- "People here survive by reporting, waiting, trading, and obeying."
- "The route forward is obvious."

### What Must Be Visually Obvious

- Player start location.
- Route from player start to authority landmark.
- Public notice / authority board.
- Low recovery settlement buildings.
- Controlled boundary edge.
- Scarcity through material wear and sparse props.

### What Must Be Intentionally Uncomfortable

- The authority point should feel unavoidable.
- Boundaries should feel controlled, not decorative.
- Settlement order should feel bureaucratic rather than cozy.
- NPC spacing should imply waiting/reporting, not casual socializing.
- The scene should be quiet and constrained, not empty or broken.

## 3. Blockout Rules With Concrete Values

### Overall Screen Footprint

- First-screen playable/visible footprint target: 16m x 12m to 22m x 16m.
- Keep the first-screen area compact enough to read on mobile.
- Do not expand the map footprint during the first corrective pass.

### Building Count Range

- Minimum: 3 visible low buildings.
- Target: 4 to 5 visible low buildings.
- Maximum for first pass: 6 visible buildings.
- Building height target: 1.8m to 3.2m visual height.
- No tall tower should compete with the notice board unless it is background-only.

### Road / Path Width

- Main route width: 2.0m to 3.0m.
- Minimum clear gameplay path: 1.6m.
- Avoid props inside the central 1.6m route.
- Path should occupy roughly 18% to 28% of first-screen visible ground.

### Player Start Area Size

- Player start visual clear zone: 3m x 3m minimum.
- No large props within 1.5m of player spawn.
- Player start should be visually lower foreground or lower-left/lower-center in the camera frame.
- Keep the spawn area readable and uncluttered.

### Notice Board Position Rule

- Notice board should be 5m to 9m from player start along the main route.
- It should sit near the visual center third of the screen, not at the extreme edge.
- It may be slightly elevated on a 0.2m to 0.5m platform or step.
- It must face the camera and player route.
- It must not exceed roughly 1.5x the height of the nearest building front.

### Authority Landmark Visibility Rule

- Notice board must be visible without moving the camera.
- It should occupy 8% to 14% of screen height.
- It should be the highest contrast landmark, but not the largest object in the scene.
- It must not block the main route or player/NPC movement.

### NPC Density Target

- First pass NPC count: 0 to 3.
- Production target after blockout: 3 to 5 visible NPCs.
- Maximum in first screen: 6 visible NPCs.
- NPC placement roles:
  - 1 near authority board.
  - 1 along route.
  - 1 near building/work area.
  - Optional 1 near boundary/waiting point.
- NPCs should imply waiting/reporting, not crowd chaos.

### Prop Density Limits

- First corrective pass: 4 to 8 non-building props total.
- Maximum final first-screen prop count: 12 to 16 visible props.
- No more than 3 props per 4m x 4m zone.
- No more than 2 prop types per local cluster.
- Every prop must support route, authority, scarcity, or boundary.

### Visual Clutter Limits

- No random prop scatter.
- No foreground object larger than 12% of screen height unless it is part of player start framing.
- No duplicated small marker poles unless they define a boundary.
- No primitive placeholder visual should dominate the frame.
- No object should visually overlap the notice board silhouette.

### Safe Zone vs Pressure Zone Separation

- Safe zone: player start, 3m x 3m, low clutter, clear route exit.
- Pressure zone: notice board/platform area, 4m x 4m, higher social/authority density.
- Boundary zone: fences/walls/edges, should guide movement but not look like military fortification.
- Work/storage zone: side area, 3m x 5m, optional crates/barrels, should not block route.

### Camera Readability Constraints

- Preserve existing quarter-view camera direction unless explicitly approved later.
- Important objects must read at mobile screenshot size.
- Key silhouettes must not overlap:
  - player start
  - notice board
  - main building fronts
  - route
- Prefer broad material blocks and clear object shape over tiny facade details.
- Avoid dark-on-dark or beige-on-beige landmark placement.

## 4. Salvage Rules For Existing Meshy Assets

### door_wood_old

Classification: scale-adjust / move.

Reason:

- Useful for main building entrances.
- Current placement appears tiny/mis-scaled and not clearly attached.

Rule:

- Use only 1 to 2 instances.
- Attach to a visible building entrance.
- Scale to read as a human-sized door: approximately 1.7m to 2.2m tall.
- Do not leave standing alone on ground.

### window_dark_frame

Classification: scale-adjust / move.

Reason:

- Useful for watched/constrained village feeling.
- Current scale appears too small for mobile readability.

Rule:

- Use 2 to 4 visible windows maximum.
- Attach flush to building wall surfaces.
- Scale so each window reads as a clear dark rectangle from the camera.
- Do not spam windows.

### prop_notice_board

Classification: keep / scale-adjust / move.

Reason:

- Core authority landmark candidate.
- Current scale/placement must be controlled; oversized board becomes accidental ugliness.

Rule:

- Use exactly 1 primary notice board.
- Place at route destination or pressure zone.
- Board height target: 2.2m to 3.0m including supports/platform.
- Must face camera and player route.
- Should feel official, not gigantic.

### prop_lamp_post

Classification: keep / move.

Reason:

- Useful for route readability and controlled settlement mood.
- Low count can help social pressure and night/watch feeling.

Rule:

- Use 1 to 3 lamps maximum.
- Place near route edge, notice board, or boundary.
- Do not place in foreground blocking view.
- Scale to be visible but secondary to notice board.

### building_porch_module

Classification: scale-adjust / selective keep.

Reason:

- Useful only if it strengthens a main entrance.
- Current scale appears too small / fragment-like.

Rule:

- Use at most 1 in first pass.
- Attach to the primary building facing the route.
- Must align with door and path.
- Remove from first screen if it reads as loose geometry.

### building_door_frame_trim

Classification: scale-adjust / selective keep.

Reason:

- Useful for making doors feel integrated.
- Current scale appears too small.

Rule:

- Use only with `door_wood_old`.
- Attach to 1 or 2 primary entrances.
- Do not use as independent decoration.

### building_window_awning

Classification: move / scale-adjust / likely optional.

Reason:

- Can add settlement detail, but risks becoming tiny visual noise.

Rule:

- Use only if window scale/attachment is solved first.
- Maximum 1 to 2 visible awnings.
- Remove from first screen if it does not read at mobile size.

## 5. Explicit Do Not Do

- No Fallout-style military outpost.
- No bunker/faction-base visual direction unless separately approved.
- No generic fantasy village.
- No cozy toy-town look.
- No random primitive clutter.
- No oversized landmark props.
- No unreadable mobile composition.
- No AI artifact objects that look unintentionally grotesque.
- No object placement because the asset exists.
- No broad auto-placement.
- No screenshot automation recovery during this production pass.
- No primitive capsule/cylinder/gray-plane dominance.
- No tiny facade details as a substitute for composition.
- No clutter to hide weak layout.

## 6. Minimal Next Unity Pass

This is the smallest manual blockout pass needed next. It should happen only after this spec is approved.

### Pass Name

Controlled Recovery Outpost Manual Blockout Pass 1

### Scope

- No new assets.
- No automation.
- No runtime code changes.
- No screenshot tooling changes.
- No broad primitive polish.
- No map footprint expansion.

### Steps

1. Preserve gameplay anchors, camera, triggers, and pathing.
2. Establish a 3m x 3m clean player start zone.
3. Place or correct exactly 1 notice board as the authority landmark.
4. Establish one 2m to 3m wide route from player start to notice board.
5. Keep 3 to 5 low building masses framing the route.
6. Attach 1 to 2 corrected doors and 2 to 4 corrected windows to buildings.
7. Add 1 to 2 lamps along route/authority edge.
8. Keep prop count under 8 total.
9. Remove or disable only visual-only primitive clutter that blocks readability.
10. Produce one manual visual proof screenshot for review.

### Expected Output

- First 5-second read is clear.
- Notice board is the authority landmark.
- Door/window/lamp placement feels attached, not scattered.
- Primitive proxy visuals no longer dominate the screenshot.
- The scene reads as a controlled recovery settlement, not asset testing.

## 7. Files That Would Need Changing If Approved

Expected:

- `unity/DeepStake3D/Assets/Scenes/WorldPrototype3D.unity`

Possible only if required:

- `unity/DeepStake3D/Assets/Resources/Meshy/deepstake_meshy_model_registry.json`
- Selected prefab files under `unity/DeepStake3D/Assets/DeepStake/Prefabs/Environment/` if wrapper scale correction is necessary.

Avoid:

- Screenshot automation scripts.
- `WorldPrototypeVisualPass.cs`.
- Runtime gameplay scripts.
- `unity/DeepStakeUnity/*`.
