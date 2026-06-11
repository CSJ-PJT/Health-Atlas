param(
    [string]$RepoPath = $(if ($env:REPO_PATH) { $env:REPO_PATH } else { "C:\Users\dan18\health-sync-daily" }),
    [string]$Branch = $(if ($env:BRANCH) { $env:BRANCH } else { "plan" }),
    [string]$TargetPid = $(if ($env:TARGET_PID) { $env:TARGET_PID } else { "15528" }),
    [string]$ImplementerPid = $(if ($env:IMPLEMENTER_PID) { $env:IMPLEMENTER_PID } else { $(if ($env:TARGET_PID) { $env:TARGET_PID } else { "15528" }) }),
    [string]$ReviewerName = $(if ($env:REVIEWER_NAME) { $env:REVIEWER_NAME } else { "codex-reviewer" }),
    [string]$MaxAutoTasks = $(if ($env:MAX_AUTO_TASKS) { $env:MAX_AUTO_TASKS } else { "unlimited" }),
    [int]$MaxQueueBacklog = $(if ($env:MAX_QUEUE_BACKLOG) { [int]$env:MAX_QUEUE_BACKLOG } else { 1 }),
    [int]$PollMilliseconds = $(if ($env:POLL_MS) { [int]$env:POLL_MS } else { 500 }),
    [string]$ContinueOnSuccess = $(if ($env:CONTINUE_ON_SUCCESS) { $env:CONTINUE_ON_SUCCESS } elseif ($env:MAX_AUTO_TASKS -eq "unlimited") { "1" } else { "" }),
    [string]$CodexModel = $(if ($env:CODEX_MODEL) { $env:CODEX_MODEL } else { "" }),
    [string]$CodexHome = $(if ($env:CODEX_HOME) { $env:CODEX_HOME } else { (Join-Path $PSScriptRoot ".codex-loop") }),
    [switch]$TestFatalNotification
)

$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$QueueDir = Join-Path $Root "queue"
$InboxDir = Join-Path $QueueDir "inbox"
$ProcessingDir = Join-Path $QueueDir "processing"
$OutboxDir = Join-Path $QueueDir "outbox"
$ReviewDir = Join-Path $QueueDir "reviews"
$StateDir = Join-Path $QueueDir "state"
$LogDir = Join-Path $QueueDir "logs"
$FatalNotifyStatePath = Join-Path $StateDir "discord-fatal-state.json"
$CodexJs = Join-Path $env:APPDATA "npm\node_modules\@openai\codex\bin\codex.js"
$CodexExe = Join-Path $env:APPDATA "npm\node_modules\@openai\codex\node_modules\@openai\codex-win32-x64\vendor\x86_64-pc-windows-msvc\codex\codex.exe"

foreach ($Dir in @($InboxDir, $ProcessingDir, $OutboxDir, $ReviewDir, $StateDir, $LogDir)) {
    New-Item -ItemType Directory -Force -Path $Dir | Out-Null
}

if (-not (Test-Path $CodexJs)) {
    throw "Codex JS entrypoint not found: $CodexJs"
}
if (-not (Test-Path $CodexExe)) {
    $CodexExe = ""
}

$CodexTmp = Join-Path $CodexHome "tmp"
New-Item -ItemType Directory -Force -Path $CodexHome | Out-Null
New-Item -ItemType Directory -Force -Path $CodexTmp | Out-Null
foreach ($Name in @("auth.json", "config.toml")) {
    $Source = Join-Path $env:USERPROFILE ".codex\$Name"
    $Target = Join-Path $CodexHome $Name
    if (Test-Path $Source) {
        Copy-Item -LiteralPath $Source -Destination $Target -Force
    }
}

$env:TARGET_PID = $TargetPid
$env:IMPLEMENTER_PID = $ImplementerPid
$env:REVIEWER_NAME = $ReviewerName
$env:REPO_PATH = $RepoPath
$env:BRANCH = $Branch
$env:MAX_AUTO_TASKS = $MaxAutoTasks
$env:MAX_QUEUE_BACKLOG = [string]$MaxQueueBacklog
$env:CONTINUE_ON_SUCCESS = if (-not [string]::IsNullOrWhiteSpace($ContinueOnSuccess)) { $ContinueOnSuccess } elseif ($MaxAutoTasks -eq "unlimited") { "1" } else { "0" }
$env:MILESTONE_MODE = "MODULAR"
$env:FAST_MODE = "1"
$env:POLL_MS = [string]$PollMilliseconds
$env:GPT_BRIDGE_POLL_MS = [string]$PollMilliseconds
$env:CODEX_HOME = $CodexHome
$env:TEMP = $CodexTmp
$env:TMP = $CodexTmp
if (-not [string]::IsNullOrWhiteSpace($CodexModel)) {
    $env:CODEX_MODEL = $CodexModel
}

function Write-JsonFile {
    param(
        [string]$Path,
        [object]$Value
    )

    $Json = $Value | ConvertTo-Json -Depth 20
    $Utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($Path, $Json, $Utf8NoBom)
}

function Read-JsonFile {
    param([string]$Path)

    $Text = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    return $Text | ConvertFrom-Json
}

if ($env:CONTINUE_ON_SUCCESS -in @("1", "true", "True")) {
    $StatePath = Join-Path $StateDir "gpt-session-state.json"
    if (Test-Path $StatePath) {
        try {
            $State = Read-JsonFile -Path $StatePath
            $State.stopped = $false
            Write-JsonFile -Path $StatePath -Value $State
        }
        catch {
            Write-Host "[modular-loop] warning: could not clear reviewer stopped state: $($_.Exception.Message)"
        }
    }
}

function Format-Duration {
    param(
        [datetime]$Start,
        [datetime]$End
    )

    $Span = $End - $Start
    if ($Span.TotalMinutes -ge 1) {
        return ("{0}m {1}s" -f [int]$Span.TotalMinutes, $Span.Seconds)
    }
    return ("{0}s" -f [int]$Span.TotalSeconds)
}

function ConvertTo-SafeLogText {
    param(
        [AllowNull()][string]$Value,
        [int]$MaxChars = 60000
    )

    if ($null -eq $Value) {
        return ""
    }

    $Clean = [regex]::Replace($Value, "[\x00-\x08\x0B\x0C\x0E-\x1F]", "")
    if ($Clean.Length -le $MaxChars) {
        return $Clean
    }

    return $Clean.Substring(0, $MaxChars) + "`n...[truncated $($Clean.Length - $MaxChars) chars]"
}

function Get-ShortText {
    param(
        [AllowNull()][string]$Value,
        [int]$MaxChars = 1000
    )

    return (ConvertTo-SafeLogText -Value $Value -MaxChars $MaxChars).Trim()
}

function Get-FatalNotificationKey {
    param(
        [string]$Component,
        [AllowNull()][string]$TaskId,
        [AllowNull()][string]$Summary
    )

    $InputText = "$Component|$TaskId|$Summary"
    $Bytes = [System.Text.Encoding]::UTF8.GetBytes($InputText)
    $Sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        return [System.BitConverter]::ToString($Sha.ComputeHash($Bytes)).Replace("-", "").Substring(0, 16).ToLowerInvariant()
    }
    finally {
        $Sha.Dispose()
    }
}

function Read-FatalNotifyState {
    if (-not (Test-Path -LiteralPath $FatalNotifyStatePath)) {
        return [pscustomobject]@{ sent = [pscustomobject]@{} }
    }

    try {
        $State = Read-JsonFile -Path $FatalNotifyStatePath
        if (-not $State.sent) {
            $State | Add-Member -MemberType NoteProperty -Name sent -Value ([pscustomobject]@{}) -Force
        }
        return $State
    }
    catch {
        return [pscustomobject]@{ sent = [pscustomobject]@{} }
    }
}

function Test-FatalNotificationSent {
    param([string]$Key)

    $State = Read-FatalNotifyState
    return $null -ne $State.sent.$Key
}

function Mark-FatalNotificationSent {
    param(
        [string]$Key,
        [string]$Component,
        [AllowNull()][string]$TaskId
    )

    $State = Read-FatalNotifyState
    $Sent = @{}
    foreach ($Property in $State.sent.PSObject.Properties) {
        $Sent[$Property.Name] = $Property.Value
    }
    $Sent[$Key] = [ordered]@{
        component = $Component
        task_id = $TaskId
        sent_at = (Get-Date).ToUniversalTime().ToString("o")
    }

    $Trimmed = [ordered]@{}
    foreach ($Entry in ($Sent.GetEnumerator() | Sort-Object { $_.Value.sent_at } | Select-Object -Last 100)) {
        $Trimmed[$Entry.Key] = $Entry.Value
    }
    Write-JsonFile -Path $FatalNotifyStatePath -Value ([ordered]@{ sent = $Trimmed })
}

function Send-DiscordFatalNotification {
    param(
        [string]$Component,
        [AllowNull()][string]$TaskId,
        [string]$Summary,
        [AllowNull()][string]$Details,
        [AllowNull()][string]$LogPath,
        [AllowNull()][int]$ExitCode
    )

    $WebhookUrl = $env:DISCORD_WEBHOOK_URL
    if ([string]::IsNullOrWhiteSpace($WebhookUrl)) {
        Write-Host "[modular-loop] fatal notification skipped: DISCORD_WEBHOOK_URL is not set."
        return
    }

    $Key = Get-FatalNotificationKey -Component $Component -TaskId $TaskId -Summary $Summary
    if (Test-FatalNotificationSent -Key $Key) {
        Write-Host "[modular-loop] fatal notification skipped: duplicate key=$Key"
        return
    }

    $SafeDetails = Get-ShortText -Value $Details -MaxChars 900
    $ExitLine = if ($null -ne $ExitCode) { "종료 코드: $ExitCode" } else { "종료 코드: 알 수 없음" }
    $TaskLine = if ([string]::IsNullOrWhiteSpace($TaskId)) { "작업: 알 수 없음" } else { ('작업: `' + $TaskId + '`') }
    $LogLine = if ([string]::IsNullOrWhiteSpace($LogPath)) { "로그: 없음" } else { "로그: $LogPath" }
    $DetailsBlock = if ([string]::IsNullOrWhiteSpace($SafeDetails)) {
        "캡처된 stderr/stdout 상세 내용이 없습니다."
    }
    else {
        ('```text' + "`n" + $SafeDetails + "`n" + '```')
    }

    $Content = @(
        "## DeepStake 개발 중단 알림",
        ('구성요소: `' + $Component + '`'),
        $TaskLine,
        "저장소: $RepoPath",
        "브랜치: $Branch",
        $ExitLine,
        "시각: $((Get-Date).ToUniversalTime().ToString('o'))",
        "",
        "**요약**",
        $Summary,
        "",
        "**상세**",
        $DetailsBlock,
        "",
        $LogLine,
        "",
        "PM 조치: 로그/결과 파일을 확인하고, 실패 원인을 이해한 뒤에만 재시작하십시오."
    ) -join "`n"

    if ($Content.Length -gt 1900) {
        $Content = $Content.Substring(0, 1890) + "`n...[truncated]"
    }

    try {
        $Payload = @{ content = $Content } | ConvertTo-Json -Depth 5
        $PayloadBytes = [System.Text.Encoding]::UTF8.GetBytes($Payload)
        Invoke-WebRequest -Uri $WebhookUrl -Method Post -ContentType "application/json; charset=utf-8" -Body $PayloadBytes -UseBasicParsing | Out-Null
        Mark-FatalNotificationSent -Key $Key -Component $Component -TaskId $TaskId
        Write-Host "[modular-loop] fatal notification sent component=$Component task=$TaskId"
    }
    catch {
        $ResponseBody = ""
        if ($_.Exception.Response) {
            try {
                $Reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
                $ResponseBody = $Reader.ReadToEnd()
                $Reader.Dispose()
            }
            catch {
                $ResponseBody = ""
            }
        }
        Write-Host "[modular-loop] fatal notification failed: $($_.Exception.Message) $ResponseBody"
    }
}

if ($TestFatalNotification) {
    $SmokeTaskId = "fatal-notification-smoke-test-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
    Send-DiscordFatalNotification `
        -Component "implementer" `
        -TaskId $SmokeTaskId `
        -Summary "테스트 실패 알림: 구현자 Codex가 개발 작업 중 치명적 오류로 중단된 상황을 가정했습니다." `
        -Details (@(
            "CONTROLLED_FAILURE_TEST=1",
            "task_id=$SmokeTaskId",
            "component=implementer",
            "exit_code=1",
            "stderr:",
            "UnhandledError: simulated implementation failure for Discord notification verification",
            "at Run-ModularLoop.ps1 TestFatalNotification",
            "reason: PM requested failure-path Discord test with detailed error output",
            "",
            "stdout:",
            "No source files were modified.",
            "No queue task was executed.",
            "This message verifies that detailed failure context reaches Discord."
        ) -join "`n") `
        -LogPath $LogDir `
        -ExitCode 1
    exit 0
}

function Invoke-CodexExec {
    param(
        [string]$Instruction,
        [string]$WorkingDirectory
    )

    $ArgList = New-Object System.Collections.Generic.List[string]
    $ArgList.Add("exec")
    if (-not [string]::IsNullOrWhiteSpace($CodexModel)) {
        $ArgList.Add("-m")
        $ArgList.Add($CodexModel)
    }
    $ArgList.Add("-")

    $StartInfo = [System.Diagnostics.ProcessStartInfo]::new()
    if ([string]::IsNullOrWhiteSpace($CodexExe)) {
        $StartInfo.FileName = "node"
        $ArgList.Insert(0, $CodexJs)
    }
    else {
        $StartInfo.FileName = $CodexExe
    }
    $StartInfo.Arguments = ($ArgList | ForEach-Object { ConvertTo-ProcessArgument $_ }) -join " "
    $StartInfo.WorkingDirectory = $WorkingDirectory
    $StartInfo.UseShellExecute = $false
    $StartInfo.RedirectStandardInput = $true
    $StartInfo.RedirectStandardOutput = $true
    $StartInfo.RedirectStandardError = $true
    $StartInfo.CreateNoWindow = $true
    $StartInfo.EnvironmentVariables["CODEX_HOME"] = $CodexHome
    $StartInfo.EnvironmentVariables["TEMP"] = $CodexTmp
    $StartInfo.EnvironmentVariables["TMP"] = $CodexTmp
    $StartInfo.EnvironmentVariables["TARGET_PID"] = $TargetPid
    $StartInfo.EnvironmentVariables["IMPLEMENTER_PID"] = $ImplementerPid
    $StartInfo.EnvironmentVariables["REVIEWER_NAME"] = $ReviewerName

    $Process = [System.Diagnostics.Process]::new()
    $Process.StartInfo = $StartInfo
    $TimeoutMs = 1800000
    if ($env:CODEX_EXEC_TIMEOUT_MS) {
        $ParsedTimeout = 0
        if ([int]::TryParse($env:CODEX_EXEC_TIMEOUT_MS, [ref]$ParsedTimeout) -and $ParsedTimeout -gt 0) {
            $TimeoutMs = $ParsedTimeout
        }
    }

    try {
        [void]$Process.Start()
        $StdoutTask = $Process.StandardOutput.ReadToEndAsync()
        $StderrTask = $Process.StandardError.ReadToEndAsync()
        $Process.StandardInput.Write($Instruction)
        $Process.StandardInput.Close()

        if (-not $Process.WaitForExit($TimeoutMs)) {
            try {
                $Process.Kill()
            }
            catch {
                # Best-effort cleanup after timeout.
            }
            $Process.WaitForExit()
            return [pscustomobject]@{
                Code = 124
                Stdout = $StdoutTask.Result
                Stderr = "timeout after $TimeoutMs ms`n$($StderrTask.Result)"
            }
        }

        $Process.WaitForExit()
        return [pscustomobject]@{
            Code = $Process.ExitCode
            Stdout = $StdoutTask.Result
            Stderr = $StderrTask.Result
        }
    }
    catch {
        return [pscustomobject]@{
            Code = 1
            Stdout = ""
            Stderr = "spawn error: $($_.Exception.Message)"
        }
    }
    finally {
        $Process.Dispose()
    }
}

function ConvertTo-ProcessArgument {
    param([string]$Value)

    if ($null -eq $Value) {
        return '""'
    }

    if ($Value -notmatch '[\s"]') {
        return $Value
    }

    return '"' + ($Value -replace '"', '\"') + '"'
}

function Process-TaskFile {
    param([string]$FilePath)

    $FileName = Split-Path -Leaf $FilePath
    $ProcessingPath = Join-Path $ProcessingDir $FileName

    if (-not (Test-Path -LiteralPath $FilePath)) {
        if (Test-Path -LiteralPath $ProcessingPath) {
            Write-Host "[modular-loop] warning: resuming already-moved task from processing: $FileName"
            $FilePath = $ProcessingPath
        }
        else {
            Write-Host "[modular-loop] warning: inbox file vanished before pickup: $FileName"
            return
        }
    }

    if ($FilePath -ne $ProcessingPath) {
        try {
            Move-Item -LiteralPath $FilePath -Destination $ProcessingPath -Force -ErrorAction Stop
        }
        catch {
            if (Test-Path -LiteralPath $ProcessingPath) {
                Write-Host "[modular-loop] warning: $FileName was already moved to processing; resuming from processing"
                $FilePath = $ProcessingPath
            }
            else {
                Write-Host "[modular-loop] warning: failed to move $FileName to processing: $($_.Exception.Message)"
                return
            }
        }
    }

    $Task = Read-JsonFile -Path $ProcessingPath
    $TaskId = if ($Task.task_id) { $Task.task_id } else { [System.IO.Path]::GetFileNameWithoutExtension($FileName) }
    $Instruction = if ($Task.instruction -is [string]) { $Task.instruction } else { $Task.instruction | ConvertTo-Json -Depth 20 }
    $TaskRepo = if ($Task.repo) { $Task.repo } else { $Root }
    $Started = Get-Date

    Write-Host "[구현자-ps] 시작 $TaskId"
    Write-Host "[구현자-ps] 지시: $($Instruction.Substring(0, [Math]::Min(180, $Instruction.Length)))"

    $Result = Invoke-CodexExec -Instruction $Instruction -WorkingDirectory $TaskRepo
    $Finished = Get-Date
    $Status = if ($Result.Code -eq 0) { "done" } else { "failed" }

    $Output = [ordered]@{
        task_id = $TaskId
        status = $Status
        started_at = $Started.ToUniversalTime().ToString("o")
        finished_at = $Finished.ToUniversalTime().ToString("o")
        repo = $TaskRepo
        branch = $Task.branch
        instruction = $Task.instruction
        constraints = @($Task.constraints)
        role = if ($Task.role) { $Task.role } else { "implementer" }
        requested_by = $Task.requested_by
        parent_task_id = $Task.parent_task_id
        implementer = [ordered]@{
            pid = [int]$ImplementerPid
            bin = if ([string]::IsNullOrWhiteSpace($CodexExe)) { "node $CodexJs" } else { $CodexExe }
            runner = "Run-ModularLoop.ps1"
            codex_home = $CodexHome
        }
        codex = [ordered]@{
            bin = if ([string]::IsNullOrWhiteSpace($CodexExe)) { "node $CodexJs" } else { $CodexExe }
            exit_code = $Result.Code
            stdout = ConvertTo-SafeLogText -Value $Result.Stdout
            stderr = ConvertTo-SafeLogText -Value $Result.Stderr
        }
    }

    Write-JsonFile -Path (Join-Path $OutboxDir "$TaskId.result.json") -Value $Output
    Remove-Item -LiteralPath $ProcessingPath -Force
    Write-Host "[구현자-ps] $Status $TaskId 종료코드=$($Result.Code) 소요=$(Format-Duration -Start $Started -End $Finished)"

    if ($Result.Code -ne 0) {
        $FailureSummary = if ($Result.Code -eq 124) {
            "구현자 Codex가 현재 개발 작업을 완료하기 전에 타임아웃되었습니다."
        }
        elseif (($Result.Stderr -match "spawn error") -or ($Result.Stderr -match "fatal") -or ($Result.Stderr -match "Unhandled|unhandled|Exception|panic")) {
            "구현자 Codex가 치명적인 런타임 오류로 종료되었습니다."
        }
        else {
            "구현자 Codex가 개발 중 실패 결과를 반환했습니다."
        }

        Send-DiscordFatalNotification `
            -Component "implementer" `
            -TaskId $TaskId `
            -Summary $FailureSummary `
            -Details ($Result.Stderr + "`n" + $Result.Stdout) `
            -LogPath (Join-Path $OutboxDir "$TaskId.result.json") `
            -ExitCode $Result.Code
    }
}

$ReviewerOut = Join-Path $LogDir "gpt.out.log"
$ReviewerErr = Join-Path $LogDir "gpt.err.log"
$Reviewer = Start-Process -FilePath "node" `
    -ArgumentList @("src/gpt-session-bridge.mjs") `
    -WorkingDirectory $Root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $ReviewerOut `
    -RedirectStandardError $ReviewerErr `
    -PassThru

Write-Host "[modular-loop] reviewer pid=$($Reviewer.Id)"
Write-Host "[modular-loop] repo=$RepoPath"
Write-Host "[modular-loop] max_auto_tasks=$MaxAutoTasks"
Write-Host "[modular-loop] backlog=$MaxQueueBacklog"
Write-Host "[modular-loop] codex=$(if ([string]::IsNullOrWhiteSpace($CodexExe)) { "node $CodexJs" } else { $CodexExe })"
Write-Host "[modular-loop] codex_home=$CodexHome"
Write-Host "[modular-loop] logs=$LogDir"

$LoopFatalAlreadyNotified = $false

try {
    while ($true) {
        if ($Reviewer -and $Reviewer.HasExited) {
            $ReviewerError = if (Test-Path -LiteralPath $ReviewerErr) { (Get-Content -LiteralPath $ReviewerErr -Tail 80) -join "`n" } else { "" }
            Send-DiscordFatalNotification `
                -Component "reviewer-bridge" `
                -TaskId $null `
                -Summary "Reviewer bridge 프로세스가 modular loop 실행 중 종료되었습니다." `
                -Details $ReviewerError `
                -LogPath $ReviewerErr `
                -ExitCode $Reviewer.ExitCode
            $LoopFatalAlreadyNotified = $true
            throw "Reviewer bridge exited with code $($Reviewer.ExitCode). See $ReviewerErr"
        }

        $TaskFile = Get-ChildItem -LiteralPath $InboxDir -Filter "*.json" -File -ErrorAction SilentlyContinue |
            Sort-Object Name |
            Select-Object -First 1

        if ($TaskFile) {
            Process-TaskFile -FilePath $TaskFile.FullName
        }

        Start-Sleep -Milliseconds $PollMilliseconds
    }
}
catch {
    if (-not $LoopFatalAlreadyNotified) {
        Send-DiscordFatalNotification `
            -Component "modular-loop" `
            -TaskId $null `
            -Summary "Modular loop가 처리되지 않은 루프 레벨 오류로 중단되었습니다." `
            -Details $_.Exception.Message `
            -LogPath $LogDir `
            -ExitCode 1
    }
    throw
}
finally {
    if ($Reviewer -and -not $Reviewer.HasExited) {
        Stop-Process -Id $Reviewer.Id -Force
    }
}
