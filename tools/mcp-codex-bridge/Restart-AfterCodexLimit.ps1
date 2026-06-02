param(
    [string]$Root = $PSScriptRoot,
    [string]$RepoPath = "C:\Users\dan18\health-sync-daily",
    [string]$Branch = "plan",
    [string]$TargetPid = "15232",
    [string]$ImplementerPid = "15232",
    [string]$ReviewerName = "codex-reviewer",
    [string]$CodexHome = "C:\Users\dan18\.codex-loop",
    [datetime]$RestartAt = ([datetime]"2026-05-21T00:55:00"),
    [int]$PollMilliseconds = 500
)

$ErrorActionPreference = "Stop"

function Write-Utf8Json {
    param(
        [string]$Path,
        [object]$Value
    )

    $Json = $Value | ConvertTo-Json -Depth 20
    [System.IO.File]::WriteAllText($Path, $Json, [System.Text.UTF8Encoding]::new($false))
}

while ((Get-Date) -lt $RestartAt) {
    Start-Sleep -Seconds 30
}

$QueueDir = Join-Path $Root "queue"
$InboxDir = Join-Path $QueueDir "inbox"
$ProcessingDir = Join-Path $QueueDir "processing"
$OutboxDir = Join-Path $QueueDir "outbox"
$StateDir = Join-Path $QueueDir "state"
$LogDir = Join-Path $QueueDir "logs"

foreach ($Dir in @($InboxDir, $ProcessingDir, $OutboxDir, $StateDir, $LogDir)) {
    New-Item -ItemType Directory -Force -Path $Dir | Out-Null
}

$ExistingLoopProcesses = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -match "Run-ModularLoop\.ps1|src/gpt-session-bridge\.mjs|codex.*exec -"
}
foreach ($ProcessInfo in $ExistingLoopProcesses) {
    Stop-Process -Id $ProcessInfo.ProcessId -Force -ErrorAction SilentlyContinue
}

$Backlog = @(
    Get-ChildItem -LiteralPath $InboxDir -Filter "*.json" -File -ErrorAction SilentlyContinue
    Get-ChildItem -LiteralPath $ProcessingDir -Filter "*.json" -File -ErrorAction SilentlyContinue
).Count

if ($Backlog -eq 0) {
    $TaskId = "modular-construction-v1-post-limit-restart-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    $Task = [ordered]@{
        task_id = $TaskId
        role = "implementer"
        requested_by = "pm"
        repo = $RepoPath
        branch = $Branch
        instruction = "DeepStake3D ModularConstructionPrototype V1 commit-readiness and next-foundation audit. Inspect current diff, scene/scripts/prefabs/tests, and report whether V1 satisfies isolated scene, 1 Unity unit = 1 meter, modular floor/wall/door/window/fence/gate pieces, grid snapping, 90-degree rotation, place/remove, and tile/chunk data. If complete, recommend commit scope/exclusions. If incomplete, identify and implement the single smallest next foundation task. Do not run Unity unless explicitly required. Do not touch WorldPrototype3D. Do not do visual polish. Do not use Korean rural/urban sample images as blockers. Keep changes small and commit-worthy."
        constraints = @(
            "Modular construction foundation only",
            "Real scale and chunk/save-load direction",
            "No visual/test-map polishing",
            "Do not touch WorldPrototype3D",
            "Do not use sample images as blockers",
            "Report changed files and validation"
        )
        created_at = (Get-Date).ToUniversalTime().ToString("o")
    }
    Write-Utf8Json -Path (Join-Path $InboxDir "$TaskId.json") -Value $Task
}

$ProcessedOutbox = @(Get-ChildItem -LiteralPath $OutboxDir -Filter "*.json" -File -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)
$State = [ordered]@{
    processedOutbox = $ProcessedOutbox
    lastResponseId = $null
    generatedCount = 0
    consecutiveFailures = 0
    lastFailureSignature = $null
    stopped = $false
}
Write-Utf8Json -Path (Join-Path $StateDir "gpt-session-state.json") -Value $State

$env:CODEX_EXEC_TIMEOUT_MS = "1800000"
$env:CONTINUE_ON_SUCCESS = "1"
$Out = Join-Path $LogDir "modular-loop-after-limit.out.log"
$Err = Join-Path $LogDir "modular-loop-after-limit.err.log"

Start-Process -FilePath "powershell.exe" `
    -ArgumentList @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", (Join-Path $Root "Run-ModularLoop.ps1"),
        "-RepoPath", $RepoPath,
        "-Branch", $Branch,
        "-TargetPid", $TargetPid,
        "-ImplementerPid", $ImplementerPid,
        "-ReviewerName", $ReviewerName,
        "-MaxAutoTasks", "unlimited",
        "-MaxQueueBacklog", "2",
        "-PollMilliseconds", [string]$PollMilliseconds,
        "-CodexHome", $CodexHome
    ) `
    -WorkingDirectory $Root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $Out `
    -RedirectStandardError $Err | Out-Null
