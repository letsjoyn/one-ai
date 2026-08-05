$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root ".dev-pids.json"

if (-not (Test-Path -LiteralPath $pidFile)) {
    Write-Host "No .dev-pids.json file exists. Nothing to stop."
    exit 0
}

$entries = @(Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json)
foreach ($entry in $entries) {
    $process = Get-Process -Id $entry.id -ErrorAction SilentlyContinue
    if (-not $process) {
        continue
    }

    $actualStart = $process.StartTime.ToUniversalTime()
    $expectedStart = [DateTime]::Parse($entry.startedAt).ToUniversalTime()
    if ([Math]::Abs(($actualStart - $expectedStart).TotalSeconds) -le 2) {
        Stop-Process -Id $entry.id -Force
        Write-Host "Stopped $($entry.name) (PID $($entry.id))."
    } else {
        Write-Warning "Skipped PID $($entry.id) because it now belongs to a different process."
    }
}

Remove-Item -LiteralPath $pidFile -Force
