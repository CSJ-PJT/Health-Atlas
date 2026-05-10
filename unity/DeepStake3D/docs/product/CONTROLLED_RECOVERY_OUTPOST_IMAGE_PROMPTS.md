# Controlled Recovery Outpost Image Prompts

This package is for generating first-screen concept images for the selected direction: Controlled Recovery Outpost.

The output should guide product/design decisions before any Unity scene editing resumes.

## 1. Core Art Direction

Controlled Recovery Outpost is a readable quarter-view game screen of a managed survival settlement.

It should not look like a generic fantasy village, a cozy toy town, or an asset showcase. It should look like a place where people survive under rules. The scene should be familiar enough to understand quickly, but emotionally wrong enough to create unease.

Core traits:

- Quarter-view game screenshot composition.
- Mobile-readable silhouettes.
- Controlled recovery settlement.
- Public notice/authority board as the first objective landmark.
- Clear player start area.
- Clear path or route from player start to authority point.
- Low buildings with muted materials.
- Scarcity, social pressure, and controlled order.
- Familiar settlement structure with intentional unease.
- No monster horror.

The emotional target is: this place works, but something is wrong.

## 2. Primary Image Prompt

Quarter-view stylized game screenshot concept art for a mobile-readable isometric survival settlement called Controlled Recovery Outpost. A small player start area sits in the lower foreground, with a clear worn path leading toward a public notice board that functions as an authority checkpoint. Low concrete and dark-wood buildings frame the route without clutter. Sparse storage crates, low fences, boundary barriers, muted lamps, worn metal roofs, dry ground, and controlled edges imply scarcity and social pressure. The settlement feels orderly, bureaucratic, cold, and uncomfortable, but still familiar and understandable within five seconds. Stylized PBR materials, muted gray beige dark wood faded green and low-saturation metal, clear silhouettes, grounded survival realism, intentional unease, no UI overlay, no readable text, no monsters, no random prop scatter.

## 3. Variation Prompts

### Variation 1: More Bureaucratic

Quarter-view stylized game screenshot concept art of a bureaucratic recovery outpost after a quiet collapse. The player start area leads along a controlled path to a public notice board and reporting post, clearly the authority point of the first screen. Low institutional buildings, worn concrete, faded signage without readable text, queue-like boundary rails, simple lamps, controlled fences, and sparse supply crates create a cold administrative survival mood. The scene should imply people report, wait, obey, and receive assignments. Mobile-readable composition, muted colors, stylized PBR, no clutter, no fantasy village, no horror monsters, no UI.

### Variation 2: More Survival/Outpost

Quarter-view stylized game screenshot concept art of a controlled survival outpost built around recovery work. A player start area opens into a narrow route between low buildings, utility storage, fences, and a central public notice board used as the first objective. The outpost has worn dark wood, patched concrete, metal roofs, dry ground, barrels, crates, lamps, and boundary blockers in very low count. It feels resource-scarce, functional, and tense, but not chaotic. Strong readable silhouettes for mobile view, grounded stylized PBR, muted palette, no random prop pile, no cute toy look, no monsters, no readable text.

### Variation 3: More Quietly Unsettling

Quarter-view stylized game screenshot concept art of a familiar recovery settlement that feels quietly wrong. The player start area faces a path toward a public notice board, with low buildings and dark windows watching the route. Fences and barriers guide movement too neatly. Lamps, storage crates, and worn walls imply survival under rules. The space is calm, controlled, and uncomfortable rather than overtly scary. Familiar village-like structure, emotionally wrong atmosphere, muted beige gray dark wood faded green, stylized PBR, clear first-screen readability, no horror monsters, no grotesque faces, no clutter, no UI, no readable text.

## 4. Negative Prompt

generic fantasy village, cozy farming village, cute toy-like low-poly town, whimsical bright colors, cheerful market, medieval tavern, magical fantasy props, neon fantasy, horror monsters, gore, grotesque AI artifacts, malformed faces, random scattered props, junk pile, messy over-detail, oversized objects, broken asset scale, floating doors, floating windows, unreadable composition, empty test-map ground, gray plane dominance, primitive capsule, primitive cylinder, UI overlay, readable text, photorealistic ruin overload, strong bloom, cyberpunk, military bunker overload

## 5. Composition Checklist

- Player start area is visible in the lower foreground or lower center.
- Notice/authority board is the clearest landmark.
- A path or route connects player start to the authority point.
- Low buildings frame the route without hiding it.
- Boundary edges communicate controlled movement.
- Props are sparse and purposeful.
- The scene reads clearly at mobile size.
- The image can be understood in 5 seconds.
- The view feels like a game screen, not a cinematic painting.
- No single prop dominates unless it is the authority landmark.

## 6. User-Perception Checklist

A first-time viewer should understand:

- "I start here."
- "The notice board or authority point matters."
- "This is a recovery settlement or outpost."
- "Movement is guided or controlled."
- "The place is functional but uncomfortable."
- "The assets belong to one world."

The viewer should feel:

- Unease.
- Social pressure.
- Scarcity.
- Controlled order.
- Curiosity.

## 7. What Would Make The Image Fail

- It looks like a generic fantasy village.
- It looks cute, cozy, or toy-like.
- It looks like a random asset dump.
- It relies on horror monsters instead of social pressure.
- AI artifacts look unintentionally grotesque.
- The public notice board is missing or unclear.
- The player start and route are unclear.
- The boundary/control feeling is missing.
- Props are oversized, mis-scaled, or floating.
- The ground looks like an empty test map.
- The image is pretty but does not communicate discomfort.
- The image is uncomfortable only because it is broken.

## 8. Notes For Later Unity Implementation

- Do not resume Unity scene editing until one concept image direction is selected.
- Start implementation with one authority landmark, one path, and a small building frame.
- Keep gameplay anchors separate from visual dressing.
- Use primitive objects only as invisible gameplay anchors or temporary blockout references.
- Replace visual dominance of gray plane/capsule/cylinder with intentional dressing.
- Avoid broad auto-placement.
- Avoid adding props to hide weak composition.
- Validate with one visual proof screenshot before expanding.

## 9. Meshy Asset Selection Implications

Useful Meshy candidates if they support the chosen concept:

- `prop_notice_board`: likely authority landmark candidate, must be scaled and placed intentionally.
- `prop_lamp_post`: useful for route/control readability, low count only.
- `door_wood_old`: useful only if attached cleanly to a building entrance.
- `window_dark_frame`: useful only if readable and wall-attached.
- `building_door_frame_trim`: useful if it strengthens a main entrance.
- `building_window_awning`: optional, only if it does not create visual noise.
- `prop_supply_crate`: useful for scarcity/storage, low count.
- `prop_wood_fence`: useful for controlled edge, low count.

Do not use Meshy assets because they exist. Use only assets required by the selected concept.

Current auto-placement is not the target. Existing models and prefabs can be reused only after selection and manual/tightly planned placement.

## Recommended Image Generation Order

1. Generate the primary prompt first.
2. Generate the more bureaucratic variation second.
3. Generate the more quietly unsettling variation third.
4. Generate the survival/outpost variation fourth only if the first three lack enough material specificity.

Selection should favor the image that best communicates authority, route, controlled boundary, scarcity, and intentional unease within 5 seconds.
