---
name: teleconference-mcp
description: Self-hosted video conferencing via teleconference-mcp. Use for rooms, conferences, LiveKit diagnostics, and remoting sidecar work.
---

# teleconference-mcp skill

Backend `:10887` (`/mcp` + `/health`), health `:10891`, web `:10886`,
remoting `:11069`, LiveKit native `:15580` (never docker).

## Before starting work
- `GET http://127.0.0.1:10887/health` must be 200, else
  `uv run python -m teleconference_mcp --serve` from repo root.
- Tools: `room_*`, `conference_*`, `participant_*`, intelligence
  (`generate_meeting_summary`, `extract_action_items`), diagnostics
  (`query_system_logs`, `orchestrate_industrial_diagnostics`).

## At end of work
- ruff + pytest green; ports registry updated if anything moved.
