# Скрипт: надежный запуск E2E с автоматическим dev-сервером (PowerShell)

param(
    [string]$Port = $env:E2E_PORT,
    [string]$DevHost = $env:E2E_HOST,
    [string]$BaseUrl = $env:E2E_BASE_URL,
    [string]$TimeoutSeconds = $env:E2E_STARTUP_TIMEOUT_SECONDS
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptRoot

if ([string]::IsNullOrWhiteSpace($Port)) { $Port = "8000" }
if ([string]::IsNullOrWhiteSpace($DevHost)) { $DevHost = "0.0.0.0" }
if ([string]::IsNullOrWhiteSpace($TimeoutSeconds)) { $TimeoutSeconds = "60" }

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
    $BaseUrl = "http://localhost:$Port/MathHelper/"
}

function Get-NpmCmdPath {
    $cmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $fallback = Get-Command npm -ErrorAction SilentlyContinue
    if ($fallback) {
        $dir = Split-Path $fallback.Source -Parent
        $npmCmd = Join-Path $dir "npm.cmd"
        if (Test-Path $npmCmd) { return $npmCmd }
    }
    throw "Не удалось найти npm.cmd"
}

function Get-PidsByPort {
    param([int]$Port)

    $pids = @()
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
        $pids = $connections | Select-Object -ExpandProperty OwningProcess
    } catch {
        $netstat = netstat -ano | Select-String -Pattern "[:.]$Port\s+LISTENING"
        foreach ($line in $netstat) {
            $parts = $line.ToString().Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
            if ($parts.Length -gt 0) {
                $pids += $parts[-1]
            }
        }
    }

    return $pids | Where-Object { $_ -and $_ -ne 0 } | Sort-Object -Unique
}

function Stop-ProcessesOnPort {
    param([int]$Port)

    $pids = Get-PidsByPort -Port $Port
    if ($pids.Count -eq 0) { return }

    Write-Host "Освобождаем порт $Port (PID: $($pids -join ', '))..."
    foreach ($procId in $pids) {
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
        } catch {
            Write-Host "Не удалось остановить PID ${procId}: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

function Get-HealthUrl {
    param([string]$BaseUrl)

    if ($BaseUrl -match "\.html$") { return $BaseUrl }
    if ($BaseUrl.EndsWith("/")) { return "$BaseUrl" + "expression-editor-modular.html" }
    return "$BaseUrl/expression-editor-modular.html"
}

function Wait-ForServer {
    param([string]$Url, [int]$Port, [int]$TimeoutSeconds)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $tcp = Test-NetConnection -ComputerName "127.0.0.1" -Port $Port -WarningAction SilentlyContinue
            if ($tcp.TcpTestSucceeded) {
                return $true
            }
        } catch { }

        try {
            $null = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
            return $true
        } catch { }

        Start-Sleep -Seconds 1
    }
    return $false
}

$npmCmd = Get-NpmCmdPath
$healthUrl = Get-HealthUrl -BaseUrl $BaseUrl
$exitCode = 1
$devProcess = $null
$devLogOut = Join-Path $env:TEMP ("mathhelper-dev-server-{0}.out.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
$devLogErr = Join-Path $env:TEMP ("mathhelper-dev-server-{0}.err.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))

try {
    Write-Host "Параметры: порт=$Port, host=$DevHost, baseURL=$BaseUrl" -ForegroundColor Cyan
    Stop-ProcessesOnPort -Port ([int]$Port)

    Write-Host "Запуск dev-сервера..." -ForegroundColor Cyan
    $devProcess = Start-Process -FilePath $npmCmd `
        -ArgumentList @("run", "dev", "--", "--host", $DevHost, "--port", $Port) `
        -WorkingDirectory $scriptRoot `
        -NoNewWindow `
        -RedirectStandardOutput $devLogOut `
        -RedirectStandardError $devLogErr `
        -PassThru

    Write-Host "Ожидание готовности: $healthUrl" -ForegroundColor Cyan
    $ready = Wait-ForServer -Url $healthUrl -Port ([int]$Port) -TimeoutSeconds ([int]$TimeoutSeconds)
    if (-not $ready) {
        Write-Host "Логи dev-сервера: $devLogOut , $devLogErr" -ForegroundColor Yellow
        if (Test-Path $devLogOut) {
            Get-Content -Path $devLogOut -Tail 50 | ForEach-Object { Write-Host $_ }
        }
        if (Test-Path $devLogErr) {
            Get-Content -Path $devLogErr -Tail 50 | ForEach-Object { Write-Host $_ }
        }
        throw "Dev-сервер не поднялся за $TimeoutSeconds секунд"
    }

    $env:E2E_BASE_URL = $BaseUrl
    $env:FORCE_COLOR = "1"

    Write-Host "Запуск E2E тестов..." -ForegroundColor Cyan
    & $npmCmd "run" "test:e2e"
    $exitCode = $LASTEXITCODE
} finally {
    Write-Host "Остановка dev-сервера..." -ForegroundColor Cyan
    if ($devProcess -and -not $devProcess.HasExited) {
        try { Stop-Process -Id $devProcess.Id -Force -ErrorAction SilentlyContinue } catch { }
    }
    Stop-ProcessesOnPort -Port ([int]$Port)
}

exit $exitCode
