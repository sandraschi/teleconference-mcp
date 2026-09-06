# Tool Reference — Conferencing MCP (28 tools, 5 modules)

Conventions: every tool takes `ctx: Context` (correlation_id logging via `cid(ctx)`),
params are `Annotated[T, Field(description="...")]`, results carry `## Return Format`.
Full signatures in `packages/conferencing_mcp/tools/`.

---

## conferences — Scheduling & invitations (9)

| Tool | Does |
|------|------|
| `conference_schedule` | Create a meeting (title, datetime, duration, room) in SQLite |
| `conference_get` | Fetch one meeting by ID |
| `conference_list` | List meetings (filters) |
| `conference_update` | Reschedule/rename a meeting |
| `conference_cancel` | Cancel a meeting |
| `conference_upcoming` | Meetings due soon (for reminders) |
| `participant_invite` | Invite a participant (generates join link) |
| `participant_list_invited` | List invitees of a meeting |
| `participant_remove_invited` | Revoke an invitation |

## rooms — LiveKit room control (8)

| Tool | Does |
|------|------|
| `room_create` | Create a room via LiveKit API (web auto-creates on join via `roomCreate` grant) |
| `room_list` | Active rooms + participant counts |
| `room_delete` | Delete a room |
| `room_update_metadata` | Set room metadata |
| `room_participant_list` | Participants in a room |
| `room_participant_kick` | Remove a participant |
| `room_participant_mute` | Mute a participant's track |
| `room_send_data` | Publish a data message (chat/intel broadcast) |

## intelligence — Meeting AI (3)

| Tool | Does |
|------|------|
| `generate_meeting_summary` | Styled synopsis from transcript (FastMCP sampling + LanceDB) |
| `extract_action_items` | TODOs/owners from transcript |
| `set_translation_language` | Target language for live translation |

## diagnostics — DevOps & forensics (7)

| Tool | Does |
|------|------|
| `get_dev_stats` | Service stats snapshot |
| `query_system_logs` | Search aggregated logs |
| `sample_log_analysis` | LLM analysis of log samples |
| `get_substrate_heartbeat` | Liveness of substrates |
| `orchestrate_industrial_diagnostics` | Full-stack diagnostic run |
| `orchestrate_remote_support` | Guided remote-support session |
| `sample_system_forensics` | System forensics sample |

## signaling — Inter-agent bus (3)

| Tool | Does |
|------|------|
| `list_active_conferences` | Live conference states |
| `notify_conference_active` | Broadcast a conference event |
| `inter_agent_ping` | Agent-to-agent liveness ping |

---

## Remoting MCP (separate server)

Screen capture share, remote mouse/keyboard (`pynput`), OCR via UIAutomation COM —
see `packages/remoting_mcp/` and [FEATURES.md](FEATURES.md).
