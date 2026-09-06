# Teleconference MCP — Agent Instructions

## Identity
You are working on **Teleconference MCP**, a self-hosted video conferencing platform with AI voice assistant, built on LiveKit and Turborepo.

## Repo Structure
- `teleconference_mcp/` — Entry point & health utilities
- `apps/agent/` — Visio AI voice agent (Python, livekit-agents)
- `apps/web/` — Next.js 16 dashboard (port 10886)
- `packages/conferencing_mcp/` — FastMCP 3.2 server with 25 tools in 5 modules (`tools/`)
- `packages/remoting_mcp/` — Screen capture + input injection MCP server
- `tests/` — Python pytest suite (95 tests)
- `mcp-central-docs/` — Fleet central docs (sibling repo)

## Standards
- **Python 3.12+**, **fastmcp>=3.1.0,<4**, **livekit-agents 1.5+**
- Ruff linting (line-length 120, double quotes)
- All MCP tools must use `Annotated[T, Field(description="...")]` params + `## Return Format` + `## Examples`
- All tools accept `ctx: Context` for correlation_id logging
- Test tools with pytest-asyncio, mock `ctx` via `mock_ctx` fixture in conftest
- Use `cid(ctx)` helper (imported from mcp_server) instead of `getattr(ctx, "correlation_id", "GLOBAL")`
- Port registry: 10886 (web frontend), 10887 (conferencing backend / FastMCP HTTP), 10891 (health/metrics), 10725 (remoting). NOT 10720/10721 (calibre-mcp) nor 10888 (myai).

## Key Files
- `tests/conftest.py` — Shared fixtures (mock_ctx, mock_livekit_api, temp_conference_db, mock_subprocess)
- `packages/conferencing_mcp/mcp_server.py` — Thin orchestrator
- `packages/conferencing_mcp/tools/` — Tool modules (diagnostics, signaling, intelligence, conferences, rooms)
- `livekit.yaml` — LiveKit server config with 2026 features
- `apps/agent/agent.py` — Voice agent with UserTurnLimitOptions + AutoRestartPolicy

## Conventions
- NO `Args:` blocks in docstrings (use `Annotated`/`Field` instead)
- NO f-strings in docstrings
- Private API prefixed with `_` (don't access from other modules)
- Start scripts: `start.ps1` + `start.bat` per service directory
- All `__init__.py` imports must be portmanteau re-exports for FastMCP registration

## Current State
- See `ASSESSMENT.md` (2026-06-12) and `TODO.md` for known bugs and the fix plan.

Install docs: follow mcp-central-docs/standards/AGENT_INSTALL_REFERENCE.md
