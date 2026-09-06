Param(
    [switch]$Headless,
    [string]$Service = 'all',
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$ScriptRoot = Split-Path -Parent $PSCommandPath

if ($Headless -and ($Host.UI.RawUI.WindowTitle -notmatch 'Hidden')) {
    Start-Process pwsh -ArgumentList '-NoProfile', '-File', $PSCommandPath, '-Headless' -WindowStyle Hidden
    exit
}

$env:FASTMCP_LOG_LEVEL = 'WARNING'

# Fleet-registered ports (WEBAPP_PORTS.md): 10886 frontend, 10887 backend,
# 10891 health/metrics. NOT 10720/10721 (calibre-mcp collision) nor 10888 (myai).
$BackendPort  = 10887
$HealthPort   = 10891
$FrontendPort = 10886

function Invoke-ClearPorts {
    foreach ($port in @($BackendPort, $HealthPort, $FrontendPort)) {
        Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
            ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    }
}

function Start-BackendDetached {
    # run_server.py serves the FastMCP HTTP backend (10887) + health (10891).
    # Launched detached so the webapp can run in the foreground of this console.
    Write-Host "  backend  :$BackendPort (health :$HealthPort)" -ForegroundColor Gray
    $env:MCP_PORT   = "$BackendPort"
    $env:HEALTH_PORT = "$HealthPort"
    return Start-Process -FilePath "uv" -ArgumentList "run", "python", "run_server.py" `
        -WorkingDirectory $ScriptRoot -WindowStyle Hidden -PassThru
}

function Start-WebForeground {
    Write-Host "  webapp   :$FrontendPort" -ForegroundColor Gray
    # Bare `npm` (not `& npm`) - the call operator mangles the npm.ps1 shim
    # into `Unknown command: "pm"`.
    npm run dev --workspace=web
}

Write-Host "Starting teleconference-mcp [$Service]..." -ForegroundColor Cyan
Invoke-ClearPorts

switch ($Service) {
    'web' {
        Start-WebForeground
        exit $LASTEXITCODE
    }
    'backend' {
        $proc = Start-BackendDetached
        Write-Host "  backend PID $($proc.Id) (detached). Ctrl+C will not stop it." -ForegroundColor Yellow
        $proc.WaitForExit()
        exit $LASTEXITCODE
    }
    'all' {
        $null = Start-BackendDetached
        if (-not $NoBrowser) {
            Write-Host "  waiting for backend health then opening browser..." -ForegroundColor Gray
            for ($i = 0; $i -lt 60; $i++) {
                try {
                    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$HealthPort/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
                    if ($r.StatusCode -eq 200) {
                        Start-Sleep -Seconds 2  # let the web server boot too
                        Start-Process "http://127.0.0.1:$FrontendPort"
                        break
                    }
                } catch {}
                Start-Sleep 1
            }
        }
        # Keep the console open as the web dev server; Ctrl+C stops the web
        # (backend keeps running in the background).
        Start-WebForeground
    }
    default {
        Write-Host "Unknown service '$Service'. Use: all | web | backend" -ForegroundColor Red
        exit 1
    }
}
