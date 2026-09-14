$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $root ".logs"
$pidFile = Join-Path $root ".dev-pids.json"

function Assert-EnvironmentFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string[]]$RequiredKeys
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing $Path. Copy the matching .env.example file and fill it first."
    }

    $values = @{}

    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmedLine = $line.Trim()

        if (
            [string]::IsNullOrWhiteSpace($trimmedLine) -or
            $trimmedLine.StartsWith("#")
        ) {
            continue
        }

        if ($trimmedLine -match '^\s*([A-Z0-9_]+)\s*=(.*)$') {
            $key = $matches[1]
            $value = $matches[2].Trim()

            # Remove matching quotes around environment values.
            if (
                ($value.StartsWith('"') -and $value.EndsWith('"')) -or
                ($value.StartsWith("'") -and $value.EndsWith("'"))
            ) {
                if ($value.Length -ge 2) {
                    $value = $value.Substring(1, $value.Length - 2)
                }
            }

            $values[$key] = $value
        }
    }

    $missing = @()

    foreach ($key in $RequiredKeys) {
        $value = $values[$key]

        if (
            [string]::IsNullOrWhiteSpace($value) -or
            $value -match '^replace-with-' -or
            $value -match 'example\.com'
        ) {
            $missing += $key
        }
    }

    if ($missing.Count -gt 0) {
        $missingList = $missing -join ", "
        throw "Complete these values in $Path before starting: $missingList"
    }
}

function Assert-PortAvailable {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $listeners = @(
        Get-NetTCPConnection `
            -State Listen `
            -LocalPort $Port `
            -ErrorAction SilentlyContinue
    )

    if ($listeners.Count -eq 0) {
        return
    }

    $ownerProcessIds = @(
        $listeners |
            Select-Object -ExpandProperty OwningProcess -Unique
    )

    foreach ($ownerProcessId in $ownerProcessIds) {
        Write-Host "Port $Port is in use by PID $ownerProcessId - killing stale process..."

        Stop-Process `
            -Id $ownerProcessId `
            -Force `
            -ErrorAction SilentlyContinue
    }

    Start-Sleep -Milliseconds 1500

    $stillListening = Get-NetTCPConnection `
        -State Listen `
        -LocalPort $Port `
        -ErrorAction SilentlyContinue

    if ($stillListening) {
        throw "Port $Port is still in use after attempting to stop the stale process."
    }
}

function Start-LoggedProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory
    )

    if (-not (Test-Path -LiteralPath $WorkingDirectory)) {
        throw "Working directory does not exist: $WorkingDirectory"
    }

    $stdout = Join-Path $logDirectory "$Name.out.log"
    $stderr = Join-Path $logDirectory "$Name.err.log"

    $startProcessParameters = @{
        FilePath               = $FilePath
        ArgumentList           = $Arguments
        WorkingDirectory       = $WorkingDirectory
        WindowStyle            = "Hidden"
        RedirectStandardOutput = $stdout
        RedirectStandardError  = $stderr
        PassThru               = $true
    }

    $process = Start-Process @startProcessParameters

    return @{
        name      = $Name
        id        = $process.Id
        startedAt = $process.StartTime.ToUniversalTime().ToString("O")
        stdout    = $stdout
        stderr    = $stderr
    }
}

$gatewayEnvironmentFile = Join-Path $root "gateway\.env"
$workerEnvironmentFile = Join-Path $root "ai-worker\.env"

Assert-EnvironmentFile `
    -Path $gatewayEnvironmentFile `
    -RequiredKeys @(
        "MONGO_URI"
        "JWT_SECRET"
        "SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY"
        "QSTASH_TOKEN"
        "INTERNAL_API_KEY"
        "METRICS_API_KEY"
    )

Assert-EnvironmentFile `
    -Path $workerEnvironmentFile `
    -RequiredKeys @(
        "MONGO_URI"
        "SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY"
        "QSTASH_CURRENT_SIGNING_KEY"
        "QSTASH_NEXT_SIGNING_KEY"
        "INTERNAL_API_KEY"
        "METRICS_API_KEY"
        "GROQ_API_KEY"
    )

Assert-PortAvailable -Port 8000
Assert-PortAvailable -Port 8080
Assert-PortAvailable -Port 5173

New-Item `
    -ItemType Directory `
    -Path $logDirectory `
    -Force |
    Out-Null

$processes = @()

try {
    $processes += Start-LoggedProcess `
        -Name "ai-worker" `
        -FilePath "py" `
        -Arguments @(
            "-3.11"
            "-m"
            "uvicorn"
            "app.main:app"
            "--reload"
            "--port"
            "8000"
        ) `
        -WorkingDirectory (Join-Path $root "ai-worker")

    $processes += Start-LoggedProcess `
        -Name "gateway" `
        -FilePath "npm.cmd" `
        -Arguments @(
            "run"
            "dev"
        ) `
        -WorkingDirectory (Join-Path $root "gateway")

    $processes += Start-LoggedProcess `
        -Name "frontend" `
        -FilePath "npm.cmd" `
        -Arguments @(
            "run"
            "dev"
            "--"
            "--host"
            "127.0.0.1"
            "--port"
            "5173"
        ) `
        -WorkingDirectory (Join-Path $root "frontend")

    $processes |
        ConvertTo-Json |
        Set-Content -LiteralPath $pidFile -Encoding UTF8
}
catch {
    foreach ($entry in $processes) {
        Stop-Process `
            -Id $entry.id `
            -Force `
            -ErrorAction SilentlyContinue
    }

    if (Test-Path -LiteralPath $pidFile) {
        Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    }

    throw
}

Write-Host ""
Write-Host "OmniQuery services started."
Write-Host "Frontend:       http://127.0.0.1:5173"
Write-Host "Gateway health: http://127.0.0.1:8080/api/health"
Write-Host "Worker health:  http://127.0.0.1:8000/health"
Write-Host "Logs:           $logDirectory"
Write-Host 'Stop everything with: .\scripts\stop-dev.ps1'