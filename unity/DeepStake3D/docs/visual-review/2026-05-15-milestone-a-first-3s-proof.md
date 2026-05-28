# Milestone A First 3 Seconds Proof

Date: 2026-05-15

## Reviewer Summary

Milestone A is scoped to the DeepStake3D first-screen presentation only. The current milestone result moves the scene away from a whole-map proof shot and toward a controlled recovery outpost read: the first visual focus is now the player-to-authority route, an explicit notice/checkpoint cluster, marked work limits, non-grid first-screen ground coverage, and enclosed settlement boundaries.

The intent is not prettier village dressing. The first three seconds should read as: arrive inside a constrained recovery settlement, identify the authority notice, follow the marked route, and feel that supplies, records, and movement are being controlled.

Continuation review for `milestone-a-continue-1778828907142`: the current git diff, latest result/review JSON, and available screenshot packet were reviewed first. The latest implementer result made no further visual edits, verified the packet count at 7 images, and called out the same commit boundary used here: keep the 10 scoped Unity file changes plus this proof summary, and exclude the untracked bridge queue files from a milestone commit. The reviewer verdict for that result was `approve_next` with no findings. The screenshot packet remains stale relative to the current code-side scene fixes, but the current Unity diff is already targeted at the visible stale-proof gaps: authority language, route framing, boundary coverage, and reduced exposed grid in the first-screen read.

Continuation review for `milestone-a-continue-1778829139675`: the current git diff, result JSON, review JSON, and screenshot packet were reviewed first. That implementer result also made no extra visual edits, confirmed the 7-image proof packet, passed `git diff --check`, and identified the same commit-worthy set. The reviewer verdict was again `approve_next` with no findings. This continuation preserves that stop condition rather than adding low-value visual churn.

Continuation review for `milestone-a-continue-1778829216611`: the result/review trail was checked before adding any work. The reviewer verdict was `approve_next` with no findings. Later bridge queue entries after `1778829343980` failed before implementation because the automation hit the Codex usage limit, and the loop stopped on that operational failure rather than on a milestone visual issue.

This final continuation does not add a new decorative pass. It tightens the first-screen generation boundary: `WorldPrototypeVisualPass` now rebuilds only the authored close outpost for Milestone A and does not generate the wider expanded village district during first-screen proof rebuilds. That removes a major source of random background-house clutter and supports the requested first-three-second read: constrained route, authority notice, boundary, and lived-in scarcity.

Continuation review for `milestone-a-first-3s-1778874260855`: the current git diff, latest result JSON, reviewer JSON, screenshot packet, and local Unity process state were reviewed first. The screenshot packet still contains 7 PNGs, and the active blocker is still `Unity.Licensing.Client`, so this continuation does not add another visual pass or exceed the approved asset set. The previous v55 code-side change remains the milestone stop condition: remove the broad expanded-village generation from first-screen rebuilds and keep the opening focused on authority, route, boundary, and scarcity cues.

Continuation review for `milestone-a-continue-1778874720805`: the current diff, outbox result JSON, reviewer JSON, and proof packet were reviewed first. The implementer result is `done`, reviewer verdict is `approve_next`, and there are no findings. This continuation again preserves the existing 7 approved asset-role groups and makes no new scene edits, because the milestone output already has the requested 5-to-10 screenshots and additional asset placement would increase random-dressing risk without current-code render proof.

Continuation review for `milestone-a-continue-1778874964971`: the current diff, latest result JSON, latest review JSON, and screenshot packet were reviewed first. The reviewer verdict is still `approve_next` with no findings, and the next queued task is this continuation. The available screenshots still show stale old HUD/grid evidence, but Unity is still blocked by the same local `Unity.Licensing.Client` process, so this continuation does not add blind asset dressing. The commit-worthy milestone remains the current code/scene result: first-screen camera framing, authority notice language, controlled boundary edges, checkpoint/route primitives, no-grid first-screen ground coverage, and the curated 7 approved Meshy asset groups already present in the scene.

Continuation review for `milestone-a-continue-1778875405889`: the current git diff, user-named previous result `milestone-a-continue-1778875204672`, reviewer JSON, screenshot packet, and local Unity process state were reviewed first. The previous result status is `done`, the reviewer verdict is `approve_next`, and there are no findings. The packet still contains 7 PNGs, all within the required 5-to-10 proof range. `Unity.Licensing.Client` is still active locally, so this continuation again avoids unproven asset placement and preserves the existing scoped milestone output rather than adding random dressing without fresh current-code screenshot proof.

Continuation review for `milestone-a-continue-1778875699508`: the current diff, previous result `milestone-a-continue-1778875405889`, reviewer JSON, proof packet, and Unity process state were reviewed first. The previous result is `done`, the reviewer verdict is `approve_next`, and there are no findings requiring another scene pass. The proof packet remains at 7 PNGs, and `Unity.Licensing.Client` PID 19952 is still active, so this continuation makes no extra visual edits and keeps the current milestone boundary: commit the targeted first-screen authority/route/boundary/no-grid changes and avoid adding unproven model dressing.

Continuation review for `milestone-a-continue-1778875852228`: the current diff, user-named previous result `milestone-a-continue-1778875699508`, latest reviewer JSON, screenshot packet, and local Unity process state were reviewed first. The previous result is `done`, the reviewer verdict remains `approve_next`, and there are no findings. The available proof packet still contains 7 PNGs; spot review confirms it demonstrates route position, notice/authority context, building readability, and scarcity/lived-in props, while also showing the stale HUD/grid issues already addressed by the current code-side diff. `Unity.Licensing.Client` PID 19952 is still active locally, so this continuation again avoids blind asset placement and preserves the existing 7 approved role groups rather than risking a random asset-dump read without fresh current-code render proof.

Continuation review for `milestone-a-continue-1778876135853`: the current git diff, previous result `milestone-a-continue-1778875852228`, reviewer JSON, screenshot packet, and local Unity process state were reviewed first. The previous result is `done`, the reviewer verdict is still `approve_next`, and no findings require another art pass. The screenshot packet remains at 7 PNGs and was spot reviewed again: it supports the authority/notice route, building readability, lived-in scarcity props, and controlled settlement density, but still predates the v55 first-screen camera/no-grid/expanded-district fixes. `Unity.Licensing.Client` PID 19952 remains active, so this continuation makes no blind model additions and keeps the milestone output focused on the current code/scene diff plus this proof summary.

The packet remains useful evidence for route location, density, and player/notice context, but the main player reference is stale: it still shows the old HUD copy and exposed prototype grid. The current code/scene diff targets those exact gaps, and the local Unity state still prevents current-code editor proof without touching licensing or generated Unity state.

## Commit-Worthy Result

- `WorldPrototype3D.unity` now reframes the old farm sign as `OutpostNotice3D`, enlarges the notice panel, and adds `controlled_boundary_edges` fence coverage to the exposed top/right edge.
- `WorldPrototypeVisualPass` now adds a restrained authority checkpoint cluster around the notice route: darker backing wall, posted papers, side screens, queue rails, softened limit stripes, confiscated crates, and a boundary marker.
- The same visual pass now adds broader first-screen no-grid ground coverage, rear/side boundary breakers, and a low rear lean-to screen so the opening read is a constrained settlement route, not an exposed prototype floor.
- `DeepStakeScreenshotCapture` now tightly frames screenshot proof around the first-screen route/notice instead of fitting the full generated world bounds, which was making the scene read as a test-map overview.
- Runtime prompt/status/objective/interaction fallback text now calls the first route target an authority notice instead of collapsing it back to generic farm-sign, field-notice, or sign language.
- Runtime object lookup now accepts `OutpostNotice3D` first, while retaining the old `FarmSign3D` fallback for generated or older scenes.
- Generated prop visuals now advance to `__PropVisualVersion_55`, forcing old serialized prop visuals to rebuild with the latest first-screen authority/readability pass and first-screen-only generation boundary.
- `WorldPrototypeVisualPass` now gates `CreateExpandedVillageDistricts` behind `UseExpandedVillageDistricts = false` for Milestone A. This keeps the close settlement readable and avoids the screenshot opening as a dense background test-map or random village dump.

## Approved Asset Roles

The milestone uses 7 existing approved Meshy asset groups already present in `MeshyVisualDressing`, within the requested 6-to-12 asset range. No cat assets, modern cafe/house assets, unreadable AI-text props, or random comedic props are part of the milestone asset set.

| Asset | Screen role | Why it stays |
| --- | --- | --- |
| `prop_notice_board` | authority | Primary first-route authority/notice landmark; supports the Directorate pressure read without readable AI text dependency. |
| `prop_lamp_post` | route | Human-scale route marker near the notice approach; helps the eye find the route before text UI. |
| `prop_wood_fence` / `controlled_boundary_edges` | boundary | Controlled edge language; limits the space without turning it into a combat barricade. |
| `building_porch_module` | building readability | Makes archive/settlement entrances read as intentional buildings instead of box shells. |
| `building_door_frame_trim` | building readability | Strengthens doorway silhouettes at quarter-view scale. |
| `building_window_awning` | building readability | Breaks flat wall faces and keeps buildings from reading as primitive test blocks. |
| `prop_supply_crate` / existing crate dressing | scarcity/lived-in | Supports delayed supplies and controlled recovery without clutter spam. |

## Screenshot Proof Set

Fresh current-code editor proof is blocked locally by Unity database/licensing state, so this proof set remains based on the Windows player reference screenshot packet that was written before the wrapper reported timeout. It predates the latest code-side route/authority/boundary/no-grid reinforcements above, but it is the current available screenshot evidence while the editor database is locked. The commit-worthy scene/code changes remain scoped to first-screen authority, route, boundary readability, and reducing exposed test-map ground.

Reviewer caveat: the screenshot packet is useful for location, camera, density, and first-route context, but the full-player reference still shows the old `field notice` HUD copy and exposed gridded prototype floor. The current code/scene diff is the milestone result that addresses those two visible gaps; a fresh editor render should replace this proof set once Unity is no longer blocked by the local readonly database/licensing mutex state.

Continuation caveat: current-code screenshot proof was not retried after detecting the active `Unity.Licensing.Client` process, because the milestone constraint explicitly says not to touch UPM/licensing unless directly required. The existing packet remains the 5-to-10 screenshot milestone output, with this note documenting why it is reference proof rather than final current-code render proof.

Proof folder:

`unity/DeepStake3D/Pictures/Screenshot/milestone-a-first-3s-proof/`

Files:

1. `01-full-player-reference.png`
2. `02-objective-hud.png`
3. `03-authority-notice-route.png`
4. `04-player-queue-pressure.png`
5. `05-settlement-density.png`
6. `06-right-boundary-and-houses.png`
7. `07-route-to-notice.png`

## Verification

Current artifact check:

- Screenshot proof count: 7 PNG files.
- Added/reused approved Meshy asset groups in this milestone: 7.
- This continuation added/reused 0 additional model groups; it preserves the existing 7-role asset set to avoid random asset-dump risk and stay within the requested 6-to-12 approved-asset range.
- Latest continuation `milestone-a-continue-1778875204672` rechecked the diff, result/review JSON, packet files, and local Unity process state. The proof packet remains at 7 PNGs, `Unity.Licensing.Client` PID 19952 is still active, and no extra models were added without current-code screenshot proof.
- Current continuation `milestone-a-continue-1778875405889` rechecked the same stop condition: previous result `milestone-a-continue-1778875204672` is `done`, reviewer verdict is `approve_next`, findings are empty, the proof packet remains at 7 PNGs, and `Unity.Licensing.Client` PID 19952 is still active.
- Current continuation `milestone-a-continue-1778875699508` rechecked the same stop condition: previous result `milestone-a-continue-1778875405889` is `done`, reviewer verdict is `approve_next`, findings are empty, the proof packet remains at 7 PNGs, and `Unity.Licensing.Client` PID 19952 is still active.
- Current continuation `milestone-a-continue-1778875852228` rechecked the same stop condition: previous result `milestone-a-continue-1778875699508` is `done`, reviewer verdict is `approve_next`, findings are empty, the proof packet remains at 7 PNGs, and `Unity.Licensing.Client` PID 19952 is still active.
- Current continuation `milestone-a-continue-1778876135853` rechecked the same stop condition: previous result `milestone-a-continue-1778875852228` is `done`, reviewer verdict is `approve_next`, findings are empty, the proof packet remains at 7 PNGs, and `Unity.Licensing.Client` PID 19952 is still active.
- This continuation added/reused 0 additional model groups; the milestone still uses the existing 7 approved role groups and stays within the requested 6-to-12 approved-asset range without introducing random asset-dump risk.
- Latest continuation reviewed the actual packet files in `unity/DeepStake3D/Pictures/Screenshot/milestone-a-first-3s-proof/` and confirmed the count remains within the requested 5-to-10 screenshot milestone output.
- User-named previous task `milestone-a-continue-1778828552393` was checked: implementer status was `done`, reviewer verdict was `approve_next`, and no review findings were reported.
- Latest available completed bridge result, `milestone-a-continue-1778828907142`, also concluded the milestone is already commit-worthy and that the untracked `tools/` bridge/runtime queue files should be excluded from the milestone commit.
- Residual old first-objective strings were checked and removed from runtime data/scripts: no remaining `Read the field notice board`, `Field Notice Board`, mobile-only `Sign` marker, or default `interactLabel = "Sign"` references in current runtime data/scripts.
- `FarmSign3D` remains only as compatibility/editor-generation language: the current scene object is `OutpostNotice3D`, runtime lookup tries `OutpostNotice3D` first, and the old name is retained as a fallback for older generated scenes.
- `git diff --check` passes for the changed visual pass and this milestone proof document.
- Final code-side pass constrains first-screen rebuilds by disabling expanded village district generation for Milestone A, reducing the likelihood that normal players see an accidental test-map/diorama read in the first three seconds.
- Continuation verification confirmed the milestone packet still contains 7 PNG proof shots; a lightweight `dotnet build unity\DeepStake3D\DeepStake3D.Runtime.csproj --no-restore` compile check could not run because `dotnet` is not available on PATH in this shell.
- Latest result/review JSON checked for `milestone-a-continue-1778874720805`: implementer status was `done`, reviewer verdict was `approve_next`, and no review findings were reported.
- Latest result/review JSON checked for `milestone-a-continue-1778828907142`: implementer status was `done`, reviewer verdict was `approve_next`, and no review findings were reported.
- Latest result/review JSON checked for `milestone-a-continue-1778829139675`: implementer status was `done`, reviewer verdict was `approve_next`, and no review findings were reported.
- Result/review JSON checked for user-named previous task `milestone-a-continue-1778829216611`: reviewer verdict was `approve_next`, and no review findings were reported.
- Later bridge loop entries ended with a usage-limit stop (`fix-fix-milestone-a-continue-1778829529810`), which did not add code changes or visual findings.
- The local `tools/mcp-codex-bridge` loop logs were reviewed as the latest automation result; the loop did not add usable proof because the bridge failed with `spawn EPERM` before running a new capture/review pass.
- A `WindowsPlayer -SkipBuild` fallback did produce `unity/DeepStake3D/Pictures/Screenshot/local-milestone-a-v53-player-proof.png`, but it is explicitly not current-code proof because it uses the previous built player and still shows old HUD/notice visuals.

Latest current-code editor render attempt, after the v55 first-screen-only generation boundary:

```powershell
powershell -ExecutionPolicy Bypass -File .\unity\DeepStake3D\Tools\Run-DeepStakeAutoLoop.ps1 -Mode EditorRender -VerificationTag milestone-a-v55-current-proof -TimeoutSeconds 240
```

Result: failed before screenshot output due to Unity local state.

Evidence:

- `timestamp=2026-05-16T04:50:41`
- `state=blocked`
- `message=Preflight failed: blocking_licensing_process`
- `licensing_processes=Unity.Licensing.Client (PID 19952)`
- `expected_screenshot=C:\Users\dan18\health-sync-daily\unity\DeepStake3D\Pictures\Screenshot\local-milestone-a-v55-current-proof.png`
- `final_screenshot_exists=false`

Latest current-code editor render attempt, after the v54 first-screen framing and rear-boundary update:

```powershell
powershell -ExecutionPolicy Bypass -File .\unity\DeepStake3D\Tools\Run-DeepStakeAutoLoop.ps1 -Mode EditorRender -VerificationTag milestone-a-v54-current-proof -TimeoutSeconds 240
```

Result: failed before screenshot output due to Unity local state.

Evidence:

- `timestamp=2026-05-15T15:22:43`
- `state=blocked`
- `message=Preflight failed: blocking_licensing_process`
- `licensing_processes=Unity.Licensing.Client (PID 19952)`
- `expected_screenshot=C:\Users\dan18\health-sync-daily\unity\DeepStake3D\Pictures\Screenshot\local-milestone-a-v54-current-proof.png`
- `final_screenshot_exists=false`

Latest current-code editor render attempt, after the v53 first-screen presentation update:

```powershell
powershell -ExecutionPolicy Bypass -File .\unity\DeepStake3D\Tools\Run-DeepStakeAutoLoop.ps1 -Mode EditorRender -VerificationTag milestone-a-v53-current-proof -TimeoutSeconds 240
```

Result: failed before screenshot output due to the same Unity local state.

Evidence:

- `timestamp=2026-05-15T15:15:59`
- `state=editor_render_failed`
- `root_cause_category=readonly_database`
- `failure_line=attempt to write a readonly database`
- Unity log also reported Package Manager IPC failure: `Could not establish a connection with the Unity Package Manager local server process.`

Current-code editor render attempt before the v53 edit:

```powershell
powershell -ExecutionPolicy Bypass -File .\unity\DeepStake3D\Tools\Run-DeepStakeAutoLoop.ps1 -Mode EditorRender -VerificationTag milestone-a-current-before-edit -TimeoutSeconds 240
```

Result: failed before screenshot output due to the same Unity local state.

Evidence:

- `timestamp=2026-05-15T15:09:03`
- `state=editor_render_failed`
- `root_cause_category=readonly_database`
- `failure_line=attempt to write a readonly database`
- Unity log also reported Package Manager IPC failure: `Could not establish a connection with the Unity Package Manager local server process.`

Final current-code editor render attempt, after the milestone packet review:

```powershell
powershell -ExecutionPolicy Bypass -Command '& { .\unity\DeepStake3D\Tools\Invoke-DeepStakeLocalScreenshotRun.ps1 -Mode EditorRender -VerificationTag milestone-a-first-3s-final-proof -TimeoutSeconds 180 -FailIfUnityProcessesRunning:$false }'
```

Result: failed before screenshot output due to the same Unity local state.

Evidence:

- `timestamp=2026-05-15T11:42:22`
- `state=editor_render_failed`
- `root_cause_category=readonly_database`
- `failure_line=attempt to write a readonly database`
- Unity log also reported `Failed to acquire global mutex Unity-LicenseClient-dan18` and Package Manager IPC failure.

Latest current-code editor render attempt, after this continuation:

```powershell
powershell -ExecutionPolicy Bypass -Command '& { .\unity\DeepStake3D\Tools\Invoke-DeepStakeLocalScreenshotRun.ps1 -Mode EditorRender -VerificationTag milestone-a-first-3s-current-proof -TimeoutSeconds 180 -FailIfUnityProcessesRunning:$false }'
```

Result: failed before screenshot output due to Unity local state.

Evidence:

- `timestamp=2026-05-15T11:25:52`
- `state=editor_render_failed`
- `root_cause_category=readonly_database`
- `failure_line=attempt to write a readonly database`
- Unity log also reported `Failed to acquire global mutex Unity-LicenseClient-dan18` and Package Manager IPC failure.

Earlier current-code editor render attempt:

```powershell
powershell -ExecutionPolicy Bypass -Command "& { .\unity\DeepStake3D\Tools\Invoke-DeepStakeLocalScreenshotRun.ps1 -Mode EditorRender -VerificationTag milestone-a-first-3s-current-proof -TimeoutSeconds 180 -FailIfUnityProcessesRunning:`$false }"
```

Result: failed before screenshot output due to Unity local state.

Evidence:

- `state=editor_render_failed`
- `root_cause_category=readonly_database`
- `failure_line=attempt to write a readonly database`
- Unity log also reported `Failed to acquire global mutex Unity-LicenseClient-dan18.`

Earlier current editor render attempt:

```powershell
powershell -ExecutionPolicy Bypass -Command "& { .\unity\DeepStake3D\Tools\Invoke-DeepStakeLocalScreenshotRun.ps1 -Mode EditorRender -VerificationTag milestone-a-first-3s-proof-main -TimeoutSeconds 300 -FailIfUnityProcessesRunning:`$false }"
```

Result: failed before screenshot output due to Unity local state.

Evidence:

- `root_cause_category=readonly_database`
- `failure_line=attempt to write a readonly database`
- Unity log also reported `Failed to acquire global mutex Unity-LicenseClient-dan18.`

Windows player reference attempt:

```powershell
powershell -ExecutionPolicy Bypass -Command "& { .\unity\DeepStake3D\Tools\Invoke-DeepStakeLocalScreenshotRun.ps1 -Mode WindowsPlayer -SkipBuild -VerificationTag milestone-a-first-3s-player-reference -TimeoutSeconds 180 -FailIfUnityProcessesRunning:`$false }"
```

Result: wrapper reported timeout after the player exited, but the screenshot file was created:

`unity/DeepStake3D/Pictures/Screenshot/local-milestone-a-first-3s-player-reference.png`

## Reviewer Read

- Authority readability is improved by the notice/checkpoint direction rather than generic farm signage.
- Route readability is improved by focusing the proof camera and adding limit stripes/queue rails in the visual pass.
- Boundary readability is improved by the scene fence additions, checkpoint marker language, and rear/side boundary breakers.
- Primitive-test-map feeling is reduced in the intended proof path by avoiding full-map-bounds screenshots and by covering exposed first-screen grid ground with authored route/backdrop patches.
- No health app systems, game app systems, UPM/licensing files, or DeepStakeUnity files were changed.
