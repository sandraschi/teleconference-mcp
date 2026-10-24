Param([switch]$Headless)

# Visio voice agent. Does not bind the conferencing backend port (10887).
if ($Headless -and ($Host.UI.RawUI.WindowTitle -notmatch 'Hidden')) {
    Start-Process pwsh -ArgumentList '-NoProfile', '-File', $PSCommandPath, '-Headless' -WindowStyle Hidden
    exit
}

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$FleetStartPath = Join-Path $RepoRoot "scripts\FleetStartMode.ps1"
if (-not (Test-Path -LiteralPath $FleetStartPath)) {
    Write-Host "ERROR: Missing vendored launcher helper: $FleetStartPath" -ForegroundColor Red
    exit 1
}
. $FleetStartPath

if (-not $env:LIVEKIT_URL) { $env:LIVEKIT_URL = "ws://127.0.0.1:15580" }
if (-not $env:LIVEKIT_API_KEY) { $env:LIVEKIT_API_KEY = "devkey" }
if (-not $env:LIVEKIT_API_SECRET) { $env:LIVEKIT_API_SECRET = "dev-secret-0123456789abcdef-0123456789abcdef" }
if (-not $env:REDIS_HOST) { $env:REDIS_HOST = "127.0.0.1" }
if (-not $env:REDIS_PORT) { $env:REDIS_PORT = "16379" }
if (-not $env:OLLAMA_BASE_URL) { $env:OLLAMA_BASE_URL = "http://127.0.0.1:11434/v1" }
if (-not $env:OLLAMA_MODEL) { $env:OLLAMA_MODEL = "llama3.1:8b" }

Write-Host "Starting Visio agent against $env:LIVEKIT_URL (model $env:OLLAMA_MODEL)" -ForegroundColor Green
Set-Location $PSScriptRoot
uv run --project $RepoRoot python agent.py dev
if (-not $?) { exit 1 }
