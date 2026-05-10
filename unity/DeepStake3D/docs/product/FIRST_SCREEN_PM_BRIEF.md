# First Screen PM Brief

## 1. Current Project Diagnosis

Requirements discovery is mostly complete, but the requirements baseline is not yet fixed.

The project moved into implementation before product and design definition were stable. Too much recent effort went into primitive visual polish, Meshy auto-placement, screenshot automation recovery, and Unity/UPM/licensing troubleshooting. These efforts produced useful pipeline knowledge, but they did not yet produce a strong first-screen user experience.

Codex was overused as a level artist and visual designer. That created technically valid changes without enough product-level visual judgment. Screenshot automation also became a sink: a screenshot pipeline can validate output, but it cannot make the screen good.

Meshy assets are useful as a library and salvage pool. The current auto-placement result is not production-worthy as-is.

## 2. Product Intent

The first screen is not a generic low-poly village.

The first screen is not an asset-placement showcase.

The first screen should be a controlled, uncomfortable recovery settlement:

- Familiar enough to understand quickly.
- Emotionally wrong enough to create unease.
- Readable as a game screen within 5 seconds.
- Structured around survival, authority, scarcity, and waiting.

The player should immediately feel that this is a place where people survive, report, obey, trade, and wait.

## 3. Intended Emotional Target

The first screen should create:

- Unease.
- Social pressure.
- Scarcity.
- Controlled order.
- Curiosity.
- A sense that people survive, report, obey, trade, and wait.

Intentional discomfort is good.

Accidental ugliness is failure.

The target is not "pretty village." The target is "this place works, but something is wrong."

## 4. User-Facing Success Criteria

Success if a first-time viewer can quickly understand:

- Where the player is.
- What the first objective or authority point is.
- Why the place feels controlled or uncomfortable.
- That the scene is intentional, not broken.
- That assets belong to the same world.

Failure if:

- Primitive capsule, cylinder, or gray plane visuals dominate the scene.
- Assets look scattered, floating, or mis-scaled.
- AI artifacts look unintentionally grotesque.
- Screenshot automation succeeds but screen quality does not improve.
- Codex reports technical success without user-facing visual improvement.

## 5. Development Methodology

Use a combined model:

- Dual-Track Agile.
- Stage-Gate.
- Lean Spike.

Discovery track:

- Define emotion, references, concept images, and user perception.
- Decide what the first screen must make the player feel before Unity implementation resumes.
- Select visual direction before asset placement.

Delivery track:

- Implement approved Unity changes only.
- Maintain asset hygiene.
- Validate with one visual proof at a time.

Stage-Gate:

- Each implementation step must pass a product/design gate before delivery work expands.
- If the visual target is not approved, implementation should stop.

Lean Spike:

- Use short bounded experiments for uncertain visual or technical bets.
- A spike must have a stop condition, time budget, and decision output.

## 6. Stage Gates

- Gate 0: PM brief approved.
- Gate 1: Emotional target fixed.
- Gate 2: Concept image/reference direction selected.
- Gate 3: Asset selection from Meshy/library.
- Gate 4: Manual or tightly planned Unity blockout.
- Gate 5: First-screen visual proof.
- Gate 6: Only then implementation expansion.

## 7. Codex Role Boundary

Codex may:

- Inspect files.
- Organize assets.
- Create inventories.
- Write docs.
- Maintain git hygiene.
- Run narrow validation.
- Implement explicitly approved plans.

Codex must not:

- Decide art direction.
- Keep tweaking visuals by guesswork.
- Act as level artist.
- Run endless screenshot recovery.
- Treat automation success as product success.
- Modify scene placement without an approved visual plan.

## 8. Meshy Asset Policy

Meshy assets are an asset library and salvage pool.

They are not an automatic placement source.

Rules:

- Do not use assets because they exist.
- Use only assets required by the chosen concept.
- Current auto-placement is not the target.
- Existing Meshy models and prefabs can be reused after selection.
- Rejected assets should remain available for reference, but should not enter the scene.

## 9. Immediate Stop Conditions

Stop work if:

- No visual target exists.
- Screenshot automation consumes more time than visual decisions.
- Codex starts guessing placement.
- Unity/UPM troubleshooting exceeds the spike budget.
- No screenshot or concept improves first 5-second perception.

## 10. Next Approved Work List

P0:

- PM brief review.
- Define first-screen emotional target.
- Select 3 reference games/scenes by emotional structure.
- Generate or collect 3 concept directions.
- Choose one direction before Unity work.

P1:

- Treat Meshy assets as a salvage library.
- Classify assets by visual role and risk.
- Reject assets that look unintentionally grotesque or too generic.
- Identify only assets needed for the chosen concept.

P2:

- Manual or tightly planned Unity blockout.
- No auto-placement.
- No broad primitive polish.
- No screenshot automation expansion.
- Produce one visual proof screenshot.

P3:

- Expand implementation only after visual proof.
- Commit only user-facing improvement or safe documentation/tooling.

## 11. Next Command Recommendation

The next Codex task should be one of:

- Create Meshy asset inventory.
- Create concept brief prompts.

The next Codex task should not be scene editing.

Recommended next single task:

Create concept brief prompts for 3 first-screen directions, then choose one direction before Unity work resumes.
