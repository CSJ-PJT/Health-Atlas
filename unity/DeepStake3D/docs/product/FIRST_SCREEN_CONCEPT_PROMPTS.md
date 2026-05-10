# First Screen Concept Prompts

This document defines three concept directions for AI concept image generation before Unity scene editing resumes.

The goal is not to create a generic low-poly village or an asset showcase. The goal is to select one first-screen direction that communicates a controlled, uncomfortable recovery settlement within 5 seconds.

## Direction A: Controlled Recovery Outpost

### 1. Name

Controlled Recovery Outpost

### 2. Emotional Target

Orderly, cold, bureaucratic survival. The place should feel functional, watched, and socially pressurized rather than chaotic.

### 3. Player First 5-Second Perception

The player has arrived at a managed recovery site. There is a clear authority point, a route into the settlement, and controlled boundaries. People here survive by reporting, waiting, and following rules.

### 4. Visual Composition

- Quarter-view game composition.
- Player start area in the lower foreground or lower center.
- Main path leads toward a public notice board or authority kiosk.
- Compact buildings frame the route.
- Fences, low barriers, lamps, and storage imply controlled movement.
- Muted gray, beige, dark wood, faded green, and low-saturation metal.

### 5. Social Structure Implied By The Scene

The settlement is run by procedure. Residents are not free-roaming villagers; they are participants in a recovery system. Authority is visible through notices, controlled routes, and waiting areas.

### 6. What Should Feel Familiar

- Small settlement layout.
- Notice board or public posting point.
- Storage crates, fences, lamps, simple buildings.
- A readable path from player start to objective.

### 7. What Should Feel Wrong

- Too much order for a survival village.
- The notice board feels like an obligation, not a community bulletin.
- Boundaries feel administrative rather than decorative.
- The scene feels quiet but monitored.

### 8. Required Visible Elements

- Player start area.
- Notice/authority landmark.
- Recovery settlement or outpost.
- Path or route.
- Boundary / controlled edge.

### 9. Things To Avoid

- Generic fantasy village.
- Cute low-poly toy look.
- Accidental horror from bad AI artifacts.
- Random scattered props.
- Oversized or mis-scaled assets.

### 10. Image-Generation Prompt In English

Quarter-view stylized game environment concept art of a controlled recovery outpost after a quiet collapse, readable first screen for an isometric survival settlement game. A small player start area leads into a narrow path toward a public notice board used as an authority checkpoint. Muted concrete buildings, worn dark wood, low metal roofs, storage crates, low fences, simple lamps, and controlled boundary edges. The scene feels orderly, bureaucratic, scarce, and uncomfortable, with social pressure and waiting implied. Stylized PBR look, muted colors, grounded survival realism, clear silhouettes, no clutter, no UI, no text, no characters required, game-ready composition, readable within five seconds.

### 11. Negative Prompt

generic fantasy village, cute toy town, bright cheerful colors, whimsical cozy village, medieval tavern, random clutter, oversized props, floating objects, broken scale, horror monsters, gore, grotesque AI faces, readable text, neon colors, cyberpunk, photorealistic debris overload, blurry composition, empty gray plane, primitive capsule, primitive cylinder

### 12. Unity Implementation Notes

- Start with one authority landmark and one readable path.
- Use buildings to frame the player route, not to fill the whole map.
- Place fences and blockers only where they communicate controlled movement.
- Keep primitive gameplay anchors separate from visual dressing.
- Do not auto-place assets. Place a very small set manually or from an approved placement plan.

### 13. Meshy Asset Usage Notes

- Strong candidates: `prop_notice_board`, `prop_lamp_post`, `prop_supply_crate`, `prop_wood_fence`, `window_dark_frame`, `door_wood_old`.
- Use only if scale and attachment can be corrected.
- Reject assets that look cute, random, or overly decorative.
- Current auto-placement should not be reused as production placement.

## Direction B: Quietly Wrong Village

### 1. Name

Quietly Wrong Village

### 2. Emotional Target

Subtle unease inside a familiar settlement. It should look livable at first glance, then feel watched, constrained, and emotionally off.

### 3. Player First 5-Second Perception

The player sees a small village-like place that should be normal, but the layout feels too controlled. The path, windows, signs, and boundaries suggest observation and pressure.

### 4. Visual Composition

- Quarter-view village structure with familiar building fronts.
- Player start area opens onto a central path.
- Notice/authority point is visible but not overly large.
- Windows and doors face the route, implying being watched.
- Fences and low walls guide movement without looking like a military base.
- Background silhouettes are calm, but the settlement feels constrained.

### 5. Social Structure Implied By The Scene

People live here, but their lives are organized around rules. Homes are close to authority points. The village feels cooperative on the surface, but compliance is expected.

### 6. What Should Feel Familiar

- Houses, doors, windows, small lamps, signs, trees.
- A path through a settlement.
- A central notice area.
- Everyday survival props.

### 7. What Should Feel Wrong

- Windows feel like observation points.
- The path feels too deliberately controlled.
- The notice board feels unavoidable.
- The village is quiet in a way that feels socially tense, not peaceful.

### 8. Required Visible Elements

- Player start area.
- Notice/authority landmark.
- Recovery settlement or outpost.
- Path or route.
- Boundary / controlled edge.

### 9. Things To Avoid

- Generic fantasy village.
- Cute low-poly toy look.
- Accidental horror from bad AI artifacts.
- Random scattered props.
- Oversized or mis-scaled assets.

### 10. Image-Generation Prompt In English

Quarter-view stylized game environment concept art of a small familiar village that feels quietly wrong and socially constrained. A readable player start area leads along a path between modest buildings with dark window frames and old wooden doors. A public notice board sits near the center as an unavoidable authority point. Low fences, trimmed boundary edges, lamps, and sparse survival props guide movement. The village looks livable but watched, calm but uncomfortable, with muted beige concrete, dark wood, faded metal, dry grass, and controlled composition. Stylized PBR, grounded survival mood, no clutter, clear first-screen readability, no UI, no readable text.

### 11. Negative Prompt

cozy fantasy village, cheerful farming game, cute toy-like low poly, bright saturated palette, random decorative clutter, huge props, floating windows, mis-scaled doors, monster horror, gore, creepy faces, readable text, neon signs, magical village, medieval castle, primitive gray plane, capsule character placeholder, cylinder marker

### 12. Unity Implementation Notes

- Prioritize correct door/window attachment before adding more props.
- Use `door_wood_old` and `window_dark_frame` only if they attach cleanly to building fronts.
- Keep the notice board readable but not oversized.
- Reduce primitive proxy dominance before adding decoration.
- Use one or two lamps as social pressure markers along the route.

### 13. Meshy Asset Usage Notes

- Strong candidates: `door_wood_old`, `window_dark_frame`, `building_window_awning`, `building_door_frame_trim`, `prop_notice_board`, `prop_lamp_post`.
- Avoid using too many props; this direction depends on composition and restraint.
- Building detail modules must be scaled and attached carefully.
- Any grotesque or malformed AI-generated house detail should be rejected.

## Direction C: Post-Collapse Reporting Yard

### 1. Name

Post-Collapse Reporting Yard

### 2. Emotional Target

Survival administration. The place should feel like a ration yard, reporting checkpoint, and work area where people queue, trade, and wait under pressure.

### 3. Player First 5-Second Perception

The player has entered a controlled work-yard. The objective is probably the notice board or reporting point. Storage, fences, lamps, and work props imply rationing, labor, and restricted movement.

### 4. Visual Composition

- Quarter-view yard-like layout.
- Player start area at the edge of a cleared route.
- Notice board or reporting board near a storage/workshop zone.
- Crates, barrels, water tank, generator, lamps, and fences in low count.
- Boundary edges clearly define where the player can move.
- Buildings feel utilitarian rather than residential.

### 5. Social Structure Implied By The Scene

This is not a home village first. It is a place where supplies are counted, work is assigned, and access is controlled. People survive by being processed through the system.

### 6. What Should Feel Familiar

- Work yard.
- Storage crates and barrels.
- Utility equipment.
- Notice board.
- Fenced route and lamps.

### 7. What Should Feel Wrong

- The yard feels administrative instead of communal.
- Storage and reporting points feel more important than homes.
- The player feels like they are entering a queue or checkpoint.
- The settlement feels functional but emotionally cold.

### 8. Required Visible Elements

- Player start area.
- Notice/authority landmark.
- Recovery settlement or outpost.
- Path or route.
- Boundary / controlled edge.

### 9. Things To Avoid

- Generic fantasy village.
- Cute low-poly toy look.
- Accidental horror from bad AI artifacts.
- Random scattered props.
- Oversized or mis-scaled assets.

### 10. Image-Generation Prompt In English

Quarter-view stylized game environment concept art of a post-collapse reporting yard for a survival settlement game. The player start area leads to a controlled route and a public reporting notice board near a small storage and workshop zone. Sparse crates, rusty barrels, a water tank, a generator, low fences, utility lamps, worn concrete, dark wood, dry ground, and muted metal roofs. The mood is rationing, work assignment, waiting, social pressure, and controlled order. Clear game screen readability, stylized PBR, muted grounded colors, no clutter, no UI, no readable text, no monsters.

### 11. Negative Prompt

fantasy marketplace, cozy village square, cheerful farm, cute toy props, random junk pile, military bunker, gore, horror creatures, grotesque AI artifacts, oversized barrel, floating crate, unreadable clutter, neon colors, strong bloom, photorealistic ruin overload, primitive gray plane, capsule placeholder, cylinder marker

### 12. Unity Implementation Notes

- This direction can reuse more utility props, but only in controlled low count.
- The notice board must be the first readable objective.
- Crates/barrels/generator/water tank should support the reporting-yard story, not decorate randomly.
- Boundary blockers should guide movement without blocking gameplay anchors.
- Avoid militarized sandbag overuse unless the concept explicitly needs it.

### 13. Meshy Asset Usage Notes

- Strong candidates: `prop_notice_board`, `prop_lamp_post`, `prop_supply_crate`, `prop_rusty_barrel`, `prop_water_tank`, `prop_generator`, `prop_wood_fence`.
- Use utility props only if they are visible from the chosen camera and do not create clutter.
- Current weak utility prop placement should not be reused without a plan.
- Reject props that cannot be scaled to read clearly from the quarter-view camera.

## Recommendation

Recommended direction to generate first:

Controlled Recovery Outpost.

Why:

- It best matches the PM brief's core phrase: controlled, uncomfortable recovery settlement.
- It gives the clearest authority landmark.
- It reduces the temptation to scatter random props.
- It creates a strong first implementation filter: every asset must support order, scarcity, and social pressure.

Decision criteria for selecting one concept image:

- Can a first-time viewer understand the player start, route, and authority point within 5 seconds?
- Does the scene feel intentionally uncomfortable rather than accidentally ugly?
- Do the assets look like they belong to one world?
- Is the composition implementable with the current Meshy/PBR library after selective reuse?
- Does the concept reduce primitive proxy dominance rather than hide it with clutter?
- Can the selected concept be translated into a small manual Unity blockout without auto-placement?
