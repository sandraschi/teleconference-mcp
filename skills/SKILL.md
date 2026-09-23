# teleconference-mcp skill

Video conferencing on this machine runs through **teleconference-mcp**:
LiveKit SFU natively (NSSM `LiveKitSFU`, `ws://localhost:15580`), FastMCP backend
on :10887 (`/mcp`), health/diagnostics on :10891, Next.js dashboard on :10886.

## Before starting work
- Check the backend is up: `GET http://127.0.0.1:10887/health` must be 200.
  If not: `uv run python -m teleconference_mcp --serve` from the repo root
  (fleet launcher `start.ps1` does this; never fight port 10887 manually).
- LiveKitSFU is a native service, NOT docker: `sc.exe query LiveKitSFU` must be
  RUNNING. Never `docker compose up` a livekit service on :15580 (2026-09-23 outage).

## Tools you have
- Rooms: `room_create`, `room_list`, `room_delete`, `room_update_metadata`,
  `room_participant_list`, `room_participant_kick`, `room_participant_mute`, `room_send_data`
- Conferences: `conference_schedule`, `conference_get`, `conference_list`,
  `conference_update`, `conference_cancel`, `conference_upcoming`
- Intelligence: `generate_meeting_summary`, `extract_action_items`, `set_translation_language`
- Diagnostics: `query_system_logs`, `sample_log_analysis`, `get_substrate_heartbeat`,
  `orchestrate_industrial_diagnostics`, `orchestrate_remote_support`, `sample_system_forensics`
- Remoting (sidecar :11069): screen/input tools in `packages/remoting_mcp`

## At end of work
- `uv run ruff check packages/ teleconference_mcp/` clean, pytest green.
- If ports changed, update `mcp-central-docs/operations/WEBAPP_PORTS.md` (never hardcode).
