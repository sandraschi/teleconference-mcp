# Teleconference MCP — Copilot instructions

Self-hosted video conferencing (LiveKit + FastMCP + Next.js) in this repo.

## Session Context (Teleconference MCP)
Before starting work: check `GET http://127.0.0.1:10887/health` (backend) and
`sc.exe query LiveKitSFU` (must be RUNNING) — never start a docker livekit on :15580.
Rooms/conferences/signaling tools live in `packages/conferencing_mcp/tools/`;
remoting sidecar in `packages/remoting_mcp/` (:11069). Ports: 10886 web, 10887 backend,
10891 health, 11069 remoting, 15580 LiveKit (native service).
At end of work: ruff + pytest green; update WEBAPP_PORTS.md if ports changed.
