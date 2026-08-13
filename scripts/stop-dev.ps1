$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root ".dev-pids.json"

function Stop-ProcessTree {
    param([int]$ProcessId)

    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId"
    foreach ($child in $children) {
        Stop-ProcessTree -ProcessId $child.ProcessId
    }

    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path -LiteralPath $pidFile)) {
    Write-Host "No .dev-pids.json file exists. Nothing to stop."
    exit 0
}

$entries = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
foreach ($entry in $entries) {
    $process = Get-Process -Id $entry.id -ErrorAction SilentlyContinue
    if (-not $process) {
        continue
    }

    $actualStart = $process.StartTime.ToUniversalTime()
    if ($entry.startedAt -is [DateTime]) {
        $expectedStart = $entry.startedAt.ToUniversalTime()
    } elseif ($entry.startedAt -is [DateTimeOffset]) {
        $expectedStart = $entry.startedAt.UtcDateTime
    } else {
        $expectedStart = [DateTimeOffset]::Parse(
            [string]$entry.startedAt,
            [Globalization.CultureInfo]::InvariantCulture,
            [Globalization.DateTimeStyles]::RoundtripKind
        ).UtcDateTime
    }
    if ([Math]::Abs(($actualStart - $expectedStart).TotalSeconds) -le 2) {
        Stop-ProcessTree -ProcessId $entry.id
        Write-Host "Stopped $($entry.name) (PID $($entry.id))."
    } else {
        Write-Warning "Skipped PID $($entry.id) because it now belongs to a different process."
    }
}

Remove-Item -LiteralPath $pidFile -Force
