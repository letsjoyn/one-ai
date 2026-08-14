$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $root ".logs"
$pidFile = Join-Path $root ".dev-pids.json"

function Assert-EnvironmentFile {
    param(
        [string]$Path,
        [string[]]$RequiredKeys
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing $Path. Copy the matching .env.example file and fill it first."
    }

    $values = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match "^\s*([A-Z0-9_]+)\s*=(.*)$") {
            $values[$matches[1]] = $matches[2].Trim()
        }
    }

    $missing = @()
    foreach ($key in $RequiredKeys) {
        $value = $values[$key]
        if (
            [string]::IsNullOrWhiteSpace($value) -or
            $value -match "^replace-with-" -or
            $value -match "example\.com"
        ) {
            $missing += $key
        }
    }

    if ($missing.Count -gt 0) {
        throw "Complete these values in $Path before starting: $($missing -join ', ')"
    }
}

function Assert-PortAvailable {
    param([int]$Port)

    $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if ($listener) {
        $pid = $listener[0].OwningProcess
        Write-Host "Port $Port in use by PID $pid — killing stale process..."
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 1500
        $still = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
        if ($still) {
            throw "Port $Port is still in use after killing PID $pid."
        }
    }
}

function Start-LoggedProcess {
    param(
        [string]$Name,
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory
    )

    $stdout = Join-Path $logDirectory "$Name.out.log"
    $stderr = Join-Path $logDirectory "$Name.err.log"
    $process = Start-Process `
        -FilePath $FilePath `
        -ArgumentList $Arguments `
        -WorkingDirectory $WorkingDirectory `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr `
        -PassThru

    return @{
        name = $Name
        id = $process.Id
        startedAt = $process.StartTime.ToUniversalTime().ToString("O")
        stdout = $stdout
        stderr = $stderr
    }
}

Assert-EnvironmentFile `
    -Path (Join-Path $root "gateway\.env") `
    -RequiredKeys @(
        "MONGO_URI",
        "JWT_SECRET",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "QSTASH_TOKEN",
        "INTERNAL_API_KEY",
        "METRICS_API_KEY"
    )

Assert-EnvironmentFile `
    -Path (Join-Path $root "ai-worker\.env") `
    -RequiredKeys @(
        "MONGO_URI",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "QSTASH_CURRENT_SIGNING_KEY",
        "QSTASH_NEXT_SIGNING_KEY",
        "INTERNAL_API_KEY",
        "METRICS_API_KEY",
        "GROQ_API_KEY"
    )

Assert-PortAvailable 8000
Assert-PortAvailable 8080
Assert-PortAvailable 5173

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

$processes = @()
try {
    $processes += Start-LoggedProcess `
        -Name "ai-worker" `
        -FilePath "py" `
        -Arguments @("-3.11", "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000") `
        -WorkingDirectory (Join-Path $root "ai-worker")

    $processes += Start-LoggedProcess `
        -Name "gateway" `
        -FilePath "npm.cmd" `
        -Arguments @("run", "dev") `
        -WorkingDirectory (Join-Path $root "gateway")

    $processes += Start-LoggedProcess `
        -Name "frontend" `
        -FilePath "npm.cmd" `
        -Arguments @("run", "dev", "--", "--host", "127.0.0.1", "--port", "5173") `
        -WorkingDirectory (Join-Path $root "frontend")

    $processes | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding utf8
} catch {
    foreach ($entry in $processes) {
        Stop-Process -Id $entry.id -Force -ErrorAction SilentlyContinue
    }
    throw
}

Write-Host ""
Write-Host "OmniQuery services started."
Write-Host "Frontend: http://127.0.0.1:5173"
Write-Host "Gateway health: http://127.0.0.1:8080/api/health"
Write-Host "Worker health: http://127.0.0.1:8000/health"
Write-Host "Logs: $logDirectory"
Write-Host "Stop everything with: .\scripts\stop-dev.ps1"
