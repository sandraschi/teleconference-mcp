Param([switch]$Headless)

# --- SOTA Headless Standard ---
if ($Headless -and ($Host.UI.RawUI.WindowTitle -notmatch 'Hidden')) {
    Start-Process pwsh -ArgumentList '-NoProfile', '-File', $PSCommandPath, '-Headless' -WindowStyle Hidden
    exit
}
$WindowStyle = if ($Headless) { 'Hidden' } else { 'Normal' }
# ------------------------------

# SOTA 2026: remoting-mcp startup
# Fleet-registered port: 11069 (WEBAPP_PORTS.md). Was 10725 (mcp-studio's port -
# this script used to kill mcp-studio's process!) and the server itself bound the
# forbidden FastMCP SSE default 8000. Both fixed 2026-09-23.
# ---------------------------------------------------------------------------

$PORT = 11069
$HOST = "127.0.0.1"

# 1. Kill existing squatters
$zombies = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($z in $zombies) {
    if ($z) {
        Write-Host "Culling zombie process: $z" -ForegroundColor Yellow
        Stop-Process -Id $z -Force
    }
}

# 2. Virtual Environment Check
if (-not (Test-Path ".venv")) {
    python -m venv .venv
    ./.venv/Scripts/python -m pip install -r requirements.txt
}

# 3. Start FastMCP SSE on the registered port
Write-Host "Targeting Port Substrate $PORT..." -ForegroundColor Cyan
$env:REMOTING_PORT = "$PORT"
$env:REMOTING_HOST = $HOST
./.venv/Scripts/python mcp_server.py


$FleetStartPath = Join-Path $ProjectRoot "scripts\FleetStartMode.ps1"
if (-not (Test-Path -LiteralPath $FleetStartPath)) {
    Write-Host "ERROR: Missing vendored launcher helper: $FleetStartPath" -ForegroundColor Red
    exit 1
}
. $FleetStartPath

