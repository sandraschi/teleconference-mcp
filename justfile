set windows-shell := ["powershell.exe", "-NoProfile", "-Command"]
import 'scripts/just/fleet.just'

# --- Dashboard ---

# Open the interactive recipe dashboard in the browser
default:
    @just --list

# --- Teams Orchestration ---

# Launch the native remoting substrate
remoting:
    Set-Location '{{justfile_directory()}}/packages/remoting_mcp'; .\start.ps1

# Launch the meeting intelligence server
conferencing:
    Set-Location '{{justfile_directory()}}/packages/conferencing_mcp'; .\start.ps1

# Launch the Visio AI agent
agent:
    Set-Location '{{justfile_directory()}}/apps/agent'; uv run python agent.py dev

# Launch the Next.js dashboard (production)
web:
    Set-Location '{{justfile_directory()}}'
    npm run start --workspace=web

# Serve the stack via the fleet launcher (backend :10887 + frontend :10886, no browser)
serve:
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File '{{justfile_directory()}}/start.ps1' -NoBrowser

# Run Playwright e2e (frontend dev server boots via webServer; backend must run: just serve)
e2e:
    Set-Location '{{justfile_directory()}}/apps/web'
    npm run test:e2e

# All green gates in one go (lint + typecheck + tests)
gates-green:
    Set-Location '{{justfile_directory()}}'
    uv run ruff check apps/ packages/ teleconference_mcp/ tests/ run_server.py; \
    uv run ruff format --check apps/ packages/ teleconference_mcp/ tests/ run_server.py; \
    uv run pytest tests/ apps/agent/tests/ -q

# Build the Next.js dashboard for production
build-web:
    Set-Location '{{justfile_directory()}}'
    npm run build --workspace=web

# --- Quality ---

# Execute Ruff SOTA v13.1 linting across monorepo
lint:
    Set-Location '{{justfile_directory()}}'
    uv run ruff check apps/ packages/ teleconference_mcp/ tests/

# Execute Ruff SOTA v13.1 fix and formatting
fix:
    Set-Location '{{justfile_directory()}}'
    uv run ruff check apps/ packages/ teleconference_mcp/ tests/ --fix --unsafe-fixes; \
    uv run ruff format apps/ packages/ teleconference_mcp/ tests/

# Run pytest across monorepo
test:
    Set-Location '{{justfile_directory()}}'
    uv run pytest

# Run mypy type checking
typecheck:
    Set-Location '{{justfile_directory()}}'
    uv run mypy apps/ packages/ teleconference_mcp/ --ignore-missing-imports

# Sync all Python dependencies
install:
    Set-Location '{{justfile_directory()}}'
    uv sync --all-extras; \
    uv pip install -e packages/conferencing_mcp -e packages/remoting_mcp

# --- Hardening ---

# Execute Bandit security audit
check-sec:
    Set-Location '{{justfile_directory()}}'
    uv run bandit -r apps/ packages/ -x **/node_modules/**,**/venv/**

# Execute safety audit of dependencies
audit-deps:
    Set-Location '{{justfile_directory()}}'
    uv run safety check

# --- Maintenance ---

# Perform PWSH-native monorepo cleanup
clean:
    @Write-Host 'Cleaning monorepo caches and nodes...' -ForegroundColor Yellow; \
    Get-ChildItem -Path . -Filter '__pycache__' -Recurse | Remove-Item -Recurse -Force; \
    Get-ChildItem -Path . -Filter '.turbo' -Recurse | Remove-Item -Recurse -Force; \
    Write-Host 'Done.' -ForegroundColor Green

# Invoke the project setup substrate
setup:
    Set-Location '{{justfile_directory()}}'
    .\setup.ps1

# --- Native  NSIS ---

# --- Build the NSIS desktop installer  full pipeline frontend  PyInstaller  Rust  NSIS ---
build-native:
    Set-Location '{{justfile_directory()}}\native'; $env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"; .\build.ps1

# Build Tauri native app in debug mode (skip PyInstaller)
build-native-debug:
    Set-Location '{{justfile_directory()}}\native'; $env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"; npx @tauri-apps/cli build --debug

# Bootstrap: install dev deps + pre-commit hook
bootstrap:
    uv sync --group dev
    uv run pre-commit install
    Write-Host "Pre-commit hooks installed." -ForegroundColor Green