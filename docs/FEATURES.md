# Features

## 1. Video Conferencing

Multi-participant WebRTC video calls via LiveKit.

- **Grid layout** with automatic focus on screen shares
- **Click-to-focus** on any participant video
- **Adaptive bitrate** based on network conditions
- **Automatic reconnection** on network interruptions
- **Token-based authentication** for room access
- **Multiple rooms**: `ag-visio-conference`, `development`, `testing`, `demo`
- **Room switching** without page reload

### Pre-Join Device Test

The `/test` page validates camera, microphone, and speakers before joining:

- Live camera preview with mirrored self-view
- Device enumeration and selection
- Audio level meter with color-coded feedback
- Speaker test with tone playback

### Supported Browsers

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

---

## 2. AI Voice Agent ("Visio")

A local-first AI assistant that joins meetings and provides intelligent assistance.

### Architecture

```
User Speech → Silero VAD → Whisper STT → Ollama LLM → Piper TTS → User Hears
                                            │
                                    ┌───────┴───────┐
                                    │ Tool Execution │
                                    └───────────────┘
```

### Capabilities

| Capability | Description |
|-----------|-------------|
| Voice Activity Detection | Silero VAD — detects when user is speaking |
| Speech-to-Text | Whisper — converts speech to text |
| LLM Reasoning | Ollama (gemma2 / llama3.1) — generates responses |
| Text-to-Speech | Piper — natural voice output |
| Turn Detection | EOU (End-of-Utterance) model |
| Jargon Detection | LDDO analysis — flags buzzword-heavy speech |
| Context Awareness | RAG memory — recalls past conversations |

### Modes

| Mode | STT | LLM | TTS |
|------|-----|-----|-----|
| `local` (default) | Whisper | Ollama | Piper |
| `cloud` | Deepgram | GPT-4o mini | OpenAI TTS |

Set `AGENT_MODE=cloud` in `apps/agent/.env` to use cloud providers.

### Tool Access

The agent can use tools via its `CombinedMCPFunctionContext`:

| Tool | Description |
|------|-------------|
| `search_contacts` | Query the address book |
| `search_knowledge_base` | Semantic search across transcripts and codebase |
| `meeting_intelligence_summary` | Generate and persist meeting summary |
| `analyze_discourse` | Detect jargon and semantic dilution |
| `request_remote_access` | Initiate remote assistance flow |
| `list_mcp_tools` | List all dynamically discovered tools |

Plus any tools discovered from MCP servers in the 10700–10800 range.

---

## 3. Meeting Intelligence Dashboard

Real-time insights panel displayed in the right sidebar during meetings.

### Features

- **Live transcription** from 3 sources: native LiveKit events, data channel, participant metadata
- **Speaker identification** with timestamps
- **50-entry scrollable history** with deduplication
- **AI summaries** generated on-demand via the "Force AI Insight" button
- **Action items** extracted from conversation
- **LanceDB persistence** — summaries survive restarts

### Data Flow

```
Browser "Force AI Insight" button
  → LiveKit data channel → Agent receives event
  → Delegates to conferencing-mcp / generate_meeting_summary
  → LLM samples via ctx.sample() → generates summary
  → Persists to LanceDB as vector embedding
  → Returns to browser → MeetingIntelligencePanel renders
```

---

## 4. Remote Desktop Support

Two approaches for remote assistance:

### A. Native Remoting (remoting-mcp)

Windows-native screen capture and input injection via the MCP server on port 10725.

| Tool | Description |
|------|-------------|
| `move_mouse(x, y)` | Move cursor to absolute position |
| `click_mouse(button)` | Perform click (left/right/middle) |
| `type_text(text)` | Type string into active window |
| `press_key(key)` | Press keyboard key |
| `join_meeting(url, token)` | Publish screen as LiveKit video track |
| `leave_meeting()` | Stop publishing and disconnect |
| `get_status()` | Check connection state |
| `screen_resolution()` | Get primary monitor resolution |

The screen capture runs at 15 FPS, converting BGRA→I420 for LiveKit.

### B. RustDesk Bridge

The dashboard includes a RustDesk web panel in the sidebar. The conferencing MCP can detect RustDesk via registry probe and launch it:

```
orchestrate_remote_support(action="status")
→ Checks HKLM\SOFTWARE\RustDesk for installation
→ Returns installed/path

orchestrate_remote_support(action="prepare")
→ Launches RustDesk executable
→ Returns PID
```

---

## 5. RAG Memory Substrate

Persistent vector storage using **LanceDB** (embedded) and **FastEmbed** (384-dim BERT-based embeddings).

### Tables

| Table | Content | Use Case |
|-------|---------|----------|
| `transcripts` | Conversation history | "What did we discuss last time?" |
| `codebase` | Indexed source code | "How does the agent work?" |
| `mission_logs` | System events | Debugging and audit trail |
| `meeting_insights` | Summaries + action items | Meeting intelligence |

### Query Example

```python
memory = MemorySubstrate()
results = memory.query_history("summer planning")
# → [{text: "We should focus on corporate plans...", speaker: "Sandra", score: 0.92}]
```

### Indexing

The `index_project()` method walks a directory tree and chunks files (`.py`, `.tsx`, `.ts`, `.md`, `.txt`) into 1000-char segments, each embedded and stored in the `codebase` table.

---

## 6. Contact Management

Multi-provider contact manager that aggregates from:

| Provider | Source | Method |
|----------|--------|--------|
| Windows Address Book | Outlook COM | `win32com.client.Dispatch("Outlook.Application")` |
| Local System Users | Windows SAM | `win32net.NetUserEnum()` |

Contacts are cached to `contacts_cache.json` for offline access.

### Search

```python
manager.search("alice")
# → [Contact(name="Alice Smith", email="alice@example.com", source="windows")]
```

---

## 7. Conference Scheduling

SQLite-backed calendaring system with Full CRUD operations.

### MCP Tools

| Tool | Description |
|------|-------------|
| `conference_schedule` | Create a scheduled conference |
| `conference_get` | Fetch conference by ID |
| `conference_list` | List with filters (status, date range) |
| `conference_update` | Modify fields |
| `conference_cancel` | Cancel a conference |
| `conference_upcoming` | List conferences in the next N days |
| `participant_invite` | Add participant to conference |
| `participant_list_invited` | List invited participants |
| `participant_remove_invited` | Remove invitation |

### Database Schema

```sql
conferences (id, title, description, room_name, scheduled_at,
             duration_min, organizer, max_participants,
             metadata, status, created_at, updated_at)

conference_participants (id, conference_id, identity,
                         display_name, role, invited_at)
```

---

## 8. Health Monitoring

Each service provides health check capabilities:

| Service | Check Method | What It Probes |
|---------|-------------|----------------|
| conferencing-mcp | Heartbeat tool | LiveKit (TCP 15580), Ollama (HTTP 11434), system metrics |
| Web dashboard | `/health` page | LiveKit reachability, active rooms |
| Shared module | `teleconference_mcp/health.py` | Generic TCP probe + Ollama status |

Health responses follow a standard format:

```json
{
  "service": "conferencing-mcp",
  "status": "PASS",
  "checks": {
    "livekit": {"status": "ALIVE", "port": 15580, "latency_ms": 2},
    "ollama": {"status": "ALIVE", "models": ["gemma2:latest"]}
  },
  "timestamp": "2026-05-01T12:00:00Z"
}
```

---

## 9. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `?` | Open help modal |
| `Esc` | Close open modal |
| `Enter` | Submit join form |

---

## 10. Meeting Recording

The dashboard includes a **Recording** button that controls LiveKit Egress recording:

- **Start recording**: Calls `POST /api/egress/start` → LiveKit RoomServiceClient creates an Egress
- **Stop recording**: Calls `POST /api/egress/stop` → terminates the Egress
- **Visual indicator**: Red pulsing button with "Stop Rec" label when active
- **Status check**: `GET /api/egress` lists active rooms and participants

The `RecordingButton` component uses `useRoomContext` to get the current room name and toggles recording via the REST API. Output is saved to the LiveKit Egress store (configurable in LiveKit server settings).

---

## 11. Background Blur

Toggle virtual background blur on your camera feed during meetings:

- **Toggle button** in the control bar area (next to recording and screen share)
- **Implementation**: `@livekit/track-processors` `BackgroundBlur` processor applied to the camera `LocalVideoTrack`
- **State**: Purple active indicator when blur is enabled
- **Fallback**: Gracefully handles environments where the processor is unavailable

Note: Background blur requires a camera track to be published. Only available after joining a room.

---

## 12. Screen Sharing (Browser)

Share your screen directly from the browser dashboard:

- **Button** in the control bar labeled "Share Screen" / "Stop Share"
- **Mechanism**: `navigator.mediaDevices.getDisplayMedia()` captures the screen → published as a LiveKit video track via `localParticipant.publishTrack()`
- **Auto-focus**: When a screen share is detected, the grid automatically switches to focus mode (70% large tile + 30% sidebar)
- **Multiple shares**: Each screen share participant gets their own tile
- **Stop**: Click "Stop Share" to unpublish the track, or the browser's native "Stop sharing" button

---

## 13. Mobile Responsive Layout

The dashboard adapts to mobile viewports:

| Element | Desktop | Mobile (< 1024px) |
|---------|---------|-------------------|
| Sidebar | Visible, collapsible | Hidden (`max-lg:hidden`) |
| Right panel | Fixed 320px | Full-width, max 320px height |
| Control bar | Single row | Wrapped (`flex-wrap`) |
| Pre-join aside | Shows tips | Hidden |
| Settings/Meetings | `p-6` padding | `p-4` padding |
| Meeting form grid | 2 columns | 1 column |

---

## 14. Multi-Participant Transcription

Transcribes ALL participants in a room, not just agent interactions:

- Each participant's audio track gets an independent STT stream
- Local mode: OpenAI Whisper API (`whisper-1` model)
- Cloud mode: Deepgram STT
- Final transcripts broadcast via LiveKit data channel
- Dashboard `TranscriptionFeed` renders them automatically (speaker name, timestamp, text)
- Cleanup on participant disconnect
- Zero frontend changes needed — uses existing `RoomEvent.DataReceived` handler

---

## 15. Docker Deployment

Full containerized stack with 8 pre-built services:

| Container | Build | Dependencies |
|-----------|-------|-------------|
| `livekit` | From `livekit.Dockerfile` | — |
| `redis` | `redis:7-alpine` | — |
| `web` | Multi-stage Next.js build | livekit |
| `agent` | Python 3.12-slim, pinned deps | livekit |
| `prometheus` | `prom/prometheus:latest` | — |
| `loki` | `grafana/loki:latest` | — |
| `grafana` | `grafana/grafana:latest` | prometheus, loki |
| `promtail` | `grafana/promtail:latest` | loki |

Build context: `docker compose build` — agent image excludes Windows-only deps (pywin32, pynput, mss).

---

## 16. Observability Stack

Three monitoring services auto-integrated:

### Prometheus (port 19090)
Scrapes every 15s:
- **LiveKit**: server health on `:15580`
- **conferencing-mcp**: `/metrics` (livekit_up, ollama_up, ollama_models_count, mcp_uptime_seconds, mcp_requests_total)
- **remoting-mcp**: `/metrics` (same format)
- **Web dashboard**: `/api/metrics` (web_uptime_milliseconds, web_requests_total)
- **Redis**: `:16379`
- **Agent**: `:10887`

### Loki (port 13100)
Receives logs from:
- `mcp_server.log` (conferencing MCP operational logs)
- `agent_industrial.log` (agent runtime logs)
- System logs via Promtail

### Grafana (port 13000)
Auto-provisioned on first start:
- **Datasources**: Prometheus + Loki (no manual config needed)
- **Dashboards**: Directory at `infrastructure/grafana/dashboards/` — add JSON dashboards there
- **Login**: admin / admin

---

## 17. Telemetry & Logging

| Feature | Description |
|---------|-------------|
| Log viewer | In-app modal with filtering and download |
| Log files | `mcp_server.log` (conferencing), `agent_industrial.log` (agent) |
| Correlation IDs | Every MCP tool call tagged with a unique ID |
| Telemetry opt-out | Toggle in Settings → Privacy |
| Session-scoped | No external transmission |

---

## System Requirements

### Client
- Modern browser with WebRTC support
- Camera and microphone access
- 1 Mbps up/down bandwidth minimum

### Server
- Windows 10+ / Linux / macOS
- Docker 24.0+
- Python 3.12+
- Node.js 18+
- 4 GB RAM minimum, 8 GB recommended

---

## 18. LiveKit 2026 Upgrades (v2.4.0 — server v1.13.6, agents v1.8.0)

| Feature | Version | Impact |
|---------|---------|--------|
| Room auto-creation from JWT grants | Server v1.12 | Eliminates manual `room_create` — rooms spawn on first join (wired in `/api/token` via `roomCreate:true`) |
| User turn duration limits | Agents v1.5.12+ | Caps user speech at 60s, prevents monologue hijack |
| Barge-in cooldown window | Agents v1.5.8 | Smoother interruptions, prevents rapid re-triggering |
| TURN credential TTL + CIDR allow/deny | Server v1.12, enforced v1.13.1 | Credentials expire; private-IP relay access control; no-TTL compat removed |
| OpenTelemetry tracing | Server v1.9.11 | Distributed spans across LiveKit -> agent -> MCP tools |
| Agent auto-restart on crash | Server v1.10 | `AutoRestartPolicy.ALWAYS` on Visio agent |
| Data tracks enabled by default | Server v1.11 | Chat, intel broadcasts, data channels active out of box |
| Egress v2 + participant capabilities | Server v1.13.2 | Real `createRoomCompositeEgress` in `/api/egress/start|stop`, `listEgress` in `/recordings` |
| Per-participant TURN quota + body limits | Server v1.13.6 | Relay quota 12, WS/API size limits, H.264 baseline removed |
| PII redaction (`lk.pii.*`) + OTel GenAI conventions | Agents v1.7/1.8 | Transcripts stay at DEBUG, safe Loki ingestion |
| Log key `pID` -> `participantID` | Server v1.10 | Update Grafana/Loki filters |

Future candidates: `useRpc` hook (Components v2.9.21), model swaps via `update_options` (Agents v1.5.10), Answering Machine Detection (Agents v1.5.9).
