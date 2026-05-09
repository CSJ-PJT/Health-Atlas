# Screenshot Automation Experiment Archive

Date: 2026-05-04

## Why This Was Archived

This experiment attempted to restore the original fully automated screenshot flow:

PowerShell command -> launch Unity -> capture serialized Meshy scene -> write screenshot, sidecar, diagnostics -> exit.

The work is archived because the automation did not reach the C# capture method. Unity launched successfully, but Package Manager startup failed before `CaptureSerializedMeshyEditorCli` executed. Keeping the active code changes would leave unvalidated runtime/editor behavior in the project.

## What Worked

- Unity launch reached after Unity Hub cleanup.
- Cleanup/preflight behavior improved.
- Root cause classification improved.
- The failure moved from preflight/licensing blocking to a clear UPM startup timeout.

## What Did Not Work

- `CaptureSerializedMeshyEditorCli` was never reached.
- UPM startup timed out twice before `executeMethod`.
- No screenshot, sidecar, or fresh serialized Meshy diagnostics were generated.

## Risk Assessment

- Runtime/controller guard is unvalidated.
- Large `DeepStakeScreenshotCapture.cs` diff is unvalidated.
- Watcher/manual request workaround is not desired as the primary workflow.
- The PowerShell mode is promising but not validated because Unity did not reach editor code.

## Future Approach

- Fix Unity/UPM environment first.
- Re-apply only the PowerShell automation parts selectively.
- Avoid runtime/controller changes unless capture reaches C# and proves they are needed.
- Keep the primary target as background automation, not menu clicks or an already-open editor watcher.
