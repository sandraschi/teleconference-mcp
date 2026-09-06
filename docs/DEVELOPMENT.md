# Development Setup

## Tools Required

Install all of these before continuing:

```powershell
# Windows (winget)
winget install astral-sh.uv
winget install Git.Git
winget install OpenJS.NodeJS
winget install Casey.Just
winget install Ollama.Ollama

# Verify
uv --version
git --version
node --version
just --version
```

Docker Desktop is needed for the container stack (LiveKit, Redis, observability).
Ollama provides the local LLM — `ollama pull gemma2` after install.

## Setup

```powershell
git clone https://github.com/sandraschi/teleconference-mcp
cd teleconference-mcp
uv sync
npm install
docker compose up -d livekit redis
```

## Common Tasks

```powershell
just lint        # ruff check + format
just test        # pytest (68 tests)
just agent       # Visio voice agent (dev)
just web         # Next.js dashboard
just conferencing # Conferencing MCP server
just remoting    # Remoting MCP server (Windows)
.\start.ps1 all  # everything via start scripts
```

## Code Standards

- Python 3.12+, `fastmcp>=3.1.0,<4`, `livekit-agents>=1.8.0`
- Ruff, line-length 120, double quotes; no `Args:` blocks in docstrings
- MCP tools: `Annotated[T, Field(description="...")]` params, `## Return Format`, `## Examples`,
  `ctx: Context` with the `cid(ctx)` helper
- Tests: pytest-asyncio, `mock_ctx` fixture from `tests/conftest.py`
- Fleet standards: `mcp-central-docs/standards/` (README structure, install reference, ports)

## Layout

```
apps/agent/            # Visio voice agent (livekit-agents)
apps/web/              # Next.js 16 dashboard (port 10886)
packages/conferencing_mcp/  # 28 FastMCP tools, 5 modules
packages/remoting_mcp/      # Screen capture + input injection
tests/                 # pytest suite
livekit.yaml           # SFU config (see docs/LIVEKIT.md)
```
