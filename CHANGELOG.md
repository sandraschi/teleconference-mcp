# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-09-23 assfix
### Fixed (fleet assfix, SOTA pass)
- **Launcher**: `python -m teleconference_mcp --serve` now boots the dual-surface backend
  (MCP `/mcp` + `/health` + `/api/shutdown` on :10887 via Starlette mount, BUG-008/038
  pattern). Fleet `start.ps1` previously launched stdio into the void.
- **CORS**: explicit origins + Tailscale/LAN regex on the backend (was: none).
- **Remoting ports**: moved off 10725 (mcp-studio's) to fleet-registered 11069; server no
  longer binds forbidden :8000 default; launcher stops killing other repos' processes.
- **LiveKit compose**: removed `livekit` service (port fight killed native LiveKitSFU);
  web/agent point at native `:15580`; ONBOARDING/README updated.
- **Lint gates green**: eslint 49 warnings → 0 (unused vars, `any` types, empty blocks,
  conditional hook extracted to `IntelligenceTab`, `disable()` → typed `destroy()`),
  tsc clean, ruff clean, pytest 104 green.
- **Contrast pass**: dim gray-500/600 UI text → gray-400/300; `text-[10px]` → `text-xs`.
- **Dev-key docs**: `.env.example` secret now matches repo dev default; livekit.yaml marked.
- **HelpModal**: fixed stale `:10800` URL → `:10886`.
### Added
- `status` MCP tool (version + TCP probes, dialogic shape); `GET /api/llm/onboarding`;
  Tauri `@tauri-apps/api` dep + `FleetEffects` (backend-status listen/HTTP fallback, zoom
  shortcuts persisted); dashboard hero + data-testids; `serve`/`e2e` just recipes;
  `skills/SKILL.md`; session-context files (copilot/opencode/antigravity); renovate.json;
  `.gitattributes`; pyright CI step (non-blocking); `T20` ruff rule; e2e backend webServer.
### Changed
- CI node 20 → 22. `logger.error` → `logger.exception` in except blocks. Direct
  `starlette`+`uvicorn` deps (were transitive-only).

## [2.3.0] - Unreleased (Planned)
### Added
- **Test infrastructure overhaul**: 7 new test files (51 tests) with parametrized tool-level coverage.
  - `test_tools_diagnostics` — heartbeat, dev_stats, logs, remote_support, forensics (9 tests)
  - `test_tools_conferencing` — CRUD lifecycle: schedule, get, list, update, cancel, upcoming (7 tests)
  - `test_tools_rooms` — room CRUD + participant mute/kick/list/send_data (9 tests)
  - `test_tools_intelligence` — meeting_summary, action_items, translation (6 tests)
  - `test_tools_signaling` — list_conferences, notify, inter_agent_ping (5 tests)
  - `test_tools_remoting` — move_mouse, click_mouse parametrized, type_text, press_key (9 tests)
  - `test_tools_participants` — invite, list_invited, remove_invited (4 tests)
- **Shared test fixtures**: `mock_ctx` (FastMCP Context + sample), `mock_livekit_api` (8 LiveKit calls), `mock_subprocess`, `temp_conference_db` (temp SQLite), `temp_lancedb`.
- **`@pytest.mark.parametrize`**: Button types, language targets, remote support actions.
- **`[tool.coverage]`** config: source paths, omit patterns, report excludes added to `pyproject.toml`.
- **Playwright E2E**: Base URL fixed 15500→10886; new `dashboard.spec.ts` (12 tests: nav, REST API, join flow).
- **LiveKit 2026 Q1-Q2 upgrades**: Documented and configured latest LiveKit features.
- **User turn duration limits** (`UserTurnLimitOptions`): Caps user speech at 60s. Graceful fallback for older SDKs.
- **Agent auto-restart**: `AutoRestartPolicy.ALWAYS` on `WorkerOptions`. Graceful fallback.
- **Structured JSON logging** config + **OpenTelemetry tracing** config + **Room auto-create** + **TURN hardening** docs.

### Changed
- **Test count**: 44→68 Python tests (+55%); 13→22 Playwright tests (+69%); total 83→116.
- **`livekit.yaml`**: Expanded from 12 to 46 lines with 2026 security and observability config.
- **`docs/LIVEKIT.md`**: Rewritten with 2026 feature section and updated config tables.
- **`docs/FEATURES.md`**: Added Section 18 (LiveKit 2026 Upgrades) with feature/version table.

### Fixed
- Removed duplicate `temp_lancedb` fixture between conftest files; removed stale `apps/agent/pytest.ini`.
- Playwright: `webServer` port 15500→10886 (fleet registry); dropped webkit (desktop-only).
- **STUN server format (2026-06-04):** `rtc.stun_servers` entries must be `host:port` (e.g. `stun.l.google.com:19302`), not `stun:host:port` — caused HTTP 500 on `/rtc` for teleoperator-mcp publisher. Rebuild LiveKit Docker image after `livekit.yaml` edit.

## [2.2.0] - 2026-05-22
### Changed
- **Monolith refactored**: `conferencing_mcp/mcp_server.py` (855 lines, 25 tools) split into `tools/` modules — `diagnostics.py` (7 tools), `signaling.py` (3 tools), `intelligence.py` (3 tools), `conferences.py` (9 tools), `rooms.py` (8 tools). Thin `mcp_server.py` orchestrator now imports tools via portmanteau `tools/__init__.py`.
- **FastMCP 3.2 docstring SOTA**: All 38 MCP tools across conferencing_mcp and remoting_mcp now use `Annotated[T, Field(description="...")]` parameter annotations with mandatory `## Return Format` and `## Examples` sections. Zero `Args:` blocks remaining.
- **Context injection for remoting_mcp**: All 8 remoting tools (`move_mouse`, `click_mouse`, `type_text`, `press_key`, `screen_resolution`, `join_meeting`, `leave_meeting`, `get_status`) now accept `ctx: Context` with correlation_id logging.
- **`cor_id` boilerplate eliminated**: Shared `cid(ctx)` helper in each server's module replaces 19x `cor_id = getattr(ctx, "correlation_id", "GLOBAL")` across 6 files.

### Fixed
- **Version constraint**: Root `pyproject.toml` `fastmcp>=0.4.1` → `>=3.1.0,<4` to match actual FastMCP 3.2 usage.
- **Private API leakage**: `_now_iso()` promoted to public `now_iso()` in `conference.py`; `conf.datetime.now(conf.timezone.utc)` replaced with direct `datetime.now(UTC)` import in tools.
- **Missing package init**: Created `packages/conferencing_mcp/__init__.py` for proper relative imports.
- **health_server.py bugs**: `_start_time` moved to class-level init (was race-condition); `_request_count` now increments before metrics string (was off-by-one).
- **Lint free**: 36 ruff errors (unused imports, bare excepts, line length, import sorting, subprocess security warnings) all fixed.

### Added
- **justfile recipes**: `test` (pytest), `typecheck` (mypy), `install` (uv sync + pip install -e).
- **justfile lint scope**: Widened from `apps/ packages/` to `apps/ packages/ myconf/ tests/`.

## [2.1.0] - 2026-05-01
### Added
- **Screen sharing from dashboard**: Custom `ScreenShareControl` component wrapping LiveKit's `useScreenShare` with error handling, loading state, and visual feedback. Mounted alongside the ControlBar.
- **Scheduling UI**: Full meeting lifecycle at `/meetings` — create form (title, datetime, duration, room), upcoming/past list, one-click copy invite link. Connected to existing `/api/meetings` REST backend.
- **Chat tab activation**: ChatPanel was imported and rendered but had no sidebar button — tab button added to the right sidebar tab row.
- **Meeting recording button**: RecordingButton component toggles LiveKit Egress via `/api/egress` API with visual recording indicator.
- **Background blur toggle**: BackgroundBlurToggle component using `@livekit/track-processors` for camera background blur.
- **Expanded E2E tests**: Added tests for settings sections, theme selector, health page, sidebar nav, meetings page, keyboard shortcuts, device test page.
- **Mobile responsive layout**: Sidebar hides on mobile (`max-lg:hidden`), right panel goes full-width on small screens, control bar wraps, pre-join aside hidden on mobile, meeting form grid stacks vertically.
- **User-friendly documentation**: Rewrote README.md with architecture diagram, port map, capability table, and links to 6 sub-readmes: `docs/INSTALL.md`, `docs/ARCHITECTURE.md`, `docs/LIVEKIT.md`, `docs/FEATURES.md`, `docs/USAGE.md`.

### Fixed
- **Entrypoint fix**: Created `myconf/` package with `__main__.py`; `uv run -m myconf` now works (was broken).
- **Dependency completeness**: Added `aiohttp`, `ollama`, `redis`, `livekit-api`, `livekit-agents`, `psutil`, `numpy` to pyproject.toml.
- **Dynamic MCP tool registration**: `_register_mcp_tool()` was a no-op — replaced with real MCP session management and tool delegation in `CombinedMCPFunctionContext`.
- **Screen capture wiring**: `publish_screen_loop` in remoting-mcp now converts BGRA→I420 and publishes real LiveKit video frames.
- **StateBus cleanup**: Added `disconnect()` method with Redis connection teardown.
- **All stubs replaced**: `contacts_substrate.py` now tries Windows COM/AD, falls back gracefully; `vision_analyze.py` uses UIAutomation for screen reading; `orchestrate_remote_support` probes registry for RustDesk; `list_active_conferences` uses real LiveKit API.
- **Docker volumes**: Added `livekit_data`, `redis_data`, `lancedb_data` persistent volumes.
- **Secrets hardening**: docker-compose.yaml now uses `${LIVEKIT_API_KEY:-devkey}` pattern instead of hardcoded secrets.
- **Version consistency**: Unified to 2.0.0 across pyproject.toml, settings page, justfile.
- **Light theme**: Wired ThemeProvider that respects `settings.theme` and applies light/dark/system mode.
- **Health monitoring**: Added `myconf/health.py` shared module and health endpoints on all services.
- **Legacy TS MCP removed**: `packages/conferencing_mcp/src/index.ts` (TypeScript SDK legacy) deleted.
- **Agent Dockerfile**: Updated to Python 3.12, copies all substrate files, adds missing system deps.
- **ModConsGrid focus release**: Releasing focus from a screen share no longer auto-snaps back to screen share - user can now freely navigate camera tracks.
- **Sidebar nav**: Replaced dead `/schedule` link with working `/meetings` entry.
- **Egress API route**: Created `/api/egress/start|stop` using `livekit-server-sdk` `RoomServiceClient`.
- **Screen share via publishTrack**: ScreenShareControl now uses `localParticipant.publishTrack()` with `getDisplayMedia` stream.
- **Background blur via track-processors**: Installed `@livekit/track-processors`, `BackgroundBlur` processor wired to camera track.
- **Zero TypeScript errors**: Fixed all type errors across BackgroundBlurToggle, ScreenShareControl, RemoteAssistanceOverlay, meetings page, ScreenShareControl.
- **MCP central docs update**: Updated fleet-registry.json (fastmcp → 3.2.0), project README and STATUS with new features and correct ports.
- **TURN server config**: Added STUN servers (Google public) and TURN section (disabled by default) to `livekit.yaml` for NAT traversal.
- **Guest join page**: Created `/join/[room]` — one-click join from a shared link, no dashboard needed. Minimal UI with name field, auto-fallback to Guest_ID.
- **Visio personality fix**: Replaced reductionist/jargon-calling system prompt with a professional, helpful AI meeting assistant prompt. Jargon detection disabled by default (opt-in via `enable_jargon_detection()`).
- **Recording viewer page**: `/recordings` page with list view (room name, date, duration, status) and Play button. API updated to return listings and clear messages when Egress storage not configured.
- **PWA support**: Added `manifest.ts` (name, icons, standalone display, theme_color), `public/icon.svg`, and apple-web-app metadata. Sidebar updated with Recordings link.
- **logic.py cleanup**: Removed aggressive reductionist prompt, made `_jargon_detection_enabled` default `False`, cleaned up `analyze_saliency` signature.
- **File sharing**: Full file sharing system — `POST /api/files` (multipart upload, max 50MB), `GET /api/files` (list), `GET /api/files/[id]` (download). Files stored in `data/files/` directory with JSON index. LiveKit data channel broadcasts `file_shared` events to other participants. `FileSharingPanel` component in dashboard sidebar (drag-and-drop, progress indicator, download button). Dedicated `/files` page with upload button and full file list. Sidebar nav updated with Files link.
- **CI hardening**: Fixed workflow — coverage paths use correct underscore dir names, added `myconf/` package to Ruff checks, proper `junit-xml` output, artifact upload. Added `[build-system]` (hatchling) to pyproject.toml so `uv sync` installs entry points correctly. Version bumped to 2.1.0 in pyproject.toml and sidebar. Real GitHub Actions badge in README replacing static badge.
- **OIDC authentication via Authentik**: Full auth integration — `next-auth` v5 with Authentik OIDC provider. Middleware protects all dashboard routes (except guest join and health). Session-aware LiveKit token endpoint uses authenticated identity. Sign-in page, error page, SessionProvider wrapper, `.env.example` with auth configuration. Auth secret, OIDC client ID/secret/issuer configurable via env vars. No database required — JWT-based sessions.
- **Multi-participant transcription**: New `TranscriptionSubstrate` in `apps/agent/transcription_substrate.py`. Subscribes to every participant's audio track and runs an independent STT stream per participant. Each stream pushes audio frames through Whisper (local) or Deepgram (cloud) STT. Final transcripts are broadcast to the room via LiveKit data channel as `{type: "transcription", speaker, transcript}` — the dashboard's existing `TranscriptionFeed` renders them automatically. Cleanup on participant disconnect.
- **Docker build fixes**: Changed agent build context from `./apps/agent` to `.` (repo root) so the `myconf/` shared package is actually available at build time. Updated agent Dockerfile paths to match new context. Web Dockerfile verified working with `output: "standalone"`.
- **Observability stack**: Added `docker-compose.observability.yaml` with Prometheus (port 19090), Loki (13100), Grafana (13000, auto-provisioned with datasources), and Promtail (log shipper). Prometheus scrapes: LiveKit (15580), conferencing-mcp (/metrics on 10721), remoting-mcp (/metrics on 10725), web dashboard (/api/metrics on 10886), agent (10887), Redis (16379). Grafana auto-configured with Prometheus + Loki datasources. New Prometheus metrics on all services — uptime, request count, LiveKit/Ollama reachability, model count. Log shipping via Promtail for `mcp_server.log` and `agent_industrial.log`.
- **Dependency fix**: Added `livekit-plugins-openai` to root pyproject.toml (required by transcription substrate). STT import made lazy with graceful fallback when API key is missing.
- **Loki config fixed**: Simplified to basic `tsdb` schema v13 with `common.path_prefix`. Removed incompatible `tsdb_shipper` config. Updated Prometheus targets to match Docker services only.
- **Gitignore cleanup**: Added `data/`, `*.db`, `lancedb_data/`, `contacts_cache.json` to prevent runtime artifacts from being committed.

## [2.0.0] - 2026-04-06
### Added
- **Teams++ AI Upgrade**: Major architectural shift to an autonomous meeting intelligence substrate.
- **Native Remoting Substrate**: Introduced `packages/remoting-mcp` for high-performance screen capture and OS-level input injection (Windows `SendInput`).
- **Dynamic MCP Discovery**: Logic implemented to scan 10700-10800 for SSE endpoints, enabling horizontal tool scaling.
- **Meeting Intelligence Dashboard**: Real-time insights panel with LanceDB-powered persistence for summaries and action items.
- **LiveKit 1.x / Agents 1.x**: Full migration to the latest agentic infrastructure.
- **Port Management**: Standardized port registries for fleet-wide compatibility.

### Changed
- Refactored `apps/agent` into a dynamic MCP client (MCPB 3.1+ compliant).
- Deprecated RustDesk IFrame bridge in favor of native LiveKit remoting.
- Hardened `CombinedMCPFunctionContext` for unified tool orchestration.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-03-17

### Added
- **Long-term Memory Substrate:**
    - Integrated `LanceDB` for high-performance vector storage and semantic recall.
    - Implemented `FastEmbed` for local text embeddings without external API dependency.
    - Automated transcript ingestion pipeline for meeting history persistence.
- **Multimodal Address Book Integration:**
    - **Microsoft Graph:** Sync support for Office 365 contacts.
    - **Windows Local:** Native Windows contact provider orchestration.
    - **Gmail (Google):** Integration for Google People API contacts.
    - **Semantic Search:** RAG-driven contact retrieval via `memory_substrate`.
- **Autonomous Perception & Orchestration:**
    - **Industrial OCR:** Added `IndustrialPerception` tool for workspace awareness.
    - **Multi-Agent Signaling:** Enhanced inter-agent communication via LiveKit data channels.
- **Unified Startup Orchestrator:**
    - Implemented `start.ps1` and `start.bat` for "One-Click" full-stack initialization.
    - Automated dependency detection and environment setup (Node/Python).

### Fixed
- **Quality Engineering:**
    - Standardized Python codebase using **Ruff**, resolving 28+ linting and architectural warnings.
    - Established comprehensive `pytest` scaffold with 100% pass rate on core brain substrates.
    - Improved agent tool delegation logic between `agent.py` and modular substrates.

## [0.2.0] - 2026-03-15

### Added
- **LiveKit 1.x & SDK v2 Upgrade:**
    - Integrated `VoicePipelineAgent` (LiveKit 1.x) with multi-agent session support.
    - Implemented End-of-Utterance (EOU) turn detection for more natural conversations.
    - Upgraded Web UI to LiveKit SDK v2 standards (Identity-based components).
- **Advanced Visualization:**
    - **Focus Mode:** Automatic Promotion of active screen shares to a large viewport (70/30 grid split).
    - **Manual Focus:** Users can manually toggle focus states for any participant/track.
- **RustDesk Integration:**
    - Professional remote control bridge via embedded `RustDeskPanel`.
    - Secure iframe sandboxing for remote interaction.
    - Triple-tab sidebar (Transcript / Chat / Remote).
- **SOTA UX:**
    - Refined dashboard glassmorphism and premium UI animations.
    - Integrated Chat Hub via LiveKit's native chat data channel.

### Fixed
- Resolved all major linting warnings in `apps/web` (SDK v2 migration cleanup).
- Standardized `TrackRef` and `ParticipantTile` usage throughout the dashboard.
- Improved transcription feed responsiveness for long-running sessions.

### [0.1.5] - 2026-02-27
- **Linting & Type Safety:**
  - Resolved 43 original linting warnings in the web application.
  - Fixed `turbo/no-undeclared-env-vars` by registering `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `OLLAMA_HOST`, `NODE_ENV`, `NEXT_PUBLIC_LIVEKIT_URL`, and `CI` in `turbo.json`.
  - Escaped JSX entities (`&quot;`, `&apos;`) in `SettingsPage` and `HelpModal`.
  - Fixed React hook dependencies and memoization (`useCallback`) in `app/test/page.tsx`.
  - Removed unused variables and imports in `page.tsx`, `settings.test.ts`, and `ShareRoomModal.tsx`.
  - Replaced literal constant binary expressions in `utils.test.ts` to satisfy logic verification rules.
- **Implicit Any:** Hardened type definitions in `telemetry.ts` and LiveKit transcription handlers, replacing `any` with `unknown` and specific interfaces.

### Added (Detailed)
- **Full dockerization:** Agent runs in Docker; `docker compose up -d` runs livekit, redis, web (port 3000), and agent. Agent uses `OLLAMA_BASE_URL` (default `http://host.docker.internal:11434/v1`) and `OLLAMA_MODEL` (default `gemma2`). `apps/agent/Dockerfile` and `.dockerignore`; compose `extra_hosts` for Linux. See README and PRD Deployment.
- **Roadmap (Phase 2.5):** Full self-host calendaring & invitations documented in PRD and README (event store, scheduling UI, invite emails via SMTP/Email MCP, MCP tools). See PRD.md.

#### Web Application UI Overhaul
- **Professional Topbar** with auth, help, and logger controls
  - User avatar with dropdown menu (settings, logout, version info)
  - Room selection dropdown with live switching between rooms
  - Connection status indicator with animated pulse
  - Help button (triggers keyboard shortcut `?`)
  - Logger button (opens log viewer modal)
  - Guest mode when not authenticated

- **Video/Audio Test Page** (`/test`)
  - Live camera preview with mirrored self-view
  - Real-time audio level monitoring with color-coded meter
  - Device selection for camera, microphone, and speakers
  - Speaker test functionality
  - Status indicators (green check / red alert)
  - Ready-to-join banner when all devices working
  - Error handling for permissions and device access

- **Log Viewer Modal**
  - Real-time log capture from telemetry and console
  - Filterable by level (all, info, warning, error, success)
  - Color-coded log entries with timestamps
  - Download logs as `.txt` file
  - Clear log history
  - Auto-scroll toggle
  - Supports up to 1000 log entries

- **Enhanced Dashboard**
  - "Test Camera & Audio" button on join screen
  - Improved join flow with clearer instructions
  - Room info display (server URL, room name)
  - Better error messaging

- **Settings System**
  - localStorage persistence for user preferences
  - LiveKit server URL configuration
  - Default room name setting
  - Audio/video/output device selection with detection
  - Theme preference (dark/light/system) - dark mode active
  - Telemetry opt-out toggle
  - Environment info display

- **Help Modal**
  - Searchable sidebar with sections
  - Getting Started guide
  - Joining Room instructions
  - Keyboard Shortcuts reference
  - Agent Behavior explanation
  - Troubleshooting tips
  - Keyboard shortcut: `?` to open

- **Retractable Sidebar**
  - Navigation links (Dashboard, Settings)
  - Collapse/expand with state persistence
  - Help button integration
  - Logo and branding

- **UI Components**
  - `Modal` - Generic reusable modal with sizes
  - `Toggle` - Reusable toggle switch
  - `Topbar` - Professional header component
  - `LogViewer` - Advanced logging interface
  - `HelpModal` - Comprehensive help system
  - CSS animations (fadeIn, slideInFromLeft, zoomIn)
  - Mirror effect for video self-view

#### Features
- **Multi-room support** with dynamic room switching
- **Device management** with detection and selection
- **Real-time transcription** panel (existing, preserved)
- **Telemetry system** with event tracking
- **Keyboard shortcuts** system
- **Responsive design** improvements

#### Technical
- Web app port changed from 3000 to 10800
- Added `cn()` utility for class name merging (clsx + tailwind-merge)
- Settings hook (`useSettings`) with localStorage integration
- Telemetry module with log/error methods
- Environment variable support for LiveKit configuration
- `.env.example` created for easy setup

### Changed
- Updated port from 3000 to 10800 in `apps/web/package.json`
- Enhanced `AppShell` with topbar integration
- Improved `app/layout.tsx` with proper metadata
- Refactored dashboard header to use Topbar component
- Updated CSS with mirror transform and additional animations

### Fixed
- Windows compatibility for MCP server disk usage (TypeScript)
- Parameter naming consistency (`limit` vs `lines`) in MCP tools
- Python agent requirements (`fastmcp` added, `asyncio` removed)
- Setup script to use `requirements.txt` properly
- Focus states and accessibility improvements

## [0.1.0] - 2025-01-28

### Initial Release

#### Core Features
- LiveKit real-time video conferencing
- Python AI voice agent ("Visio") with Ollama integration
- Next.js web frontend with LiveKit client
- Docker Compose infrastructure (LiveKit + Redis)
- Dual-language MCP server (Python + TypeScript)

#### Agent Capabilities
- Silero VAD (Voice Activity Detection)
- Whisper STT (Speech-to-Text)
- Piper TTS (Text-to-Speech)
- Ollama LLM integration (gemma2)
- Jargon and LDDO pattern detection

#### MCP Tools
- `get_dev_stats` - Git and disk statistics
- `query_system_logs` - Windows Event Log queries

#### Infrastructure
- Turborepo monorepo setup
- PowerShell setup script (`setup.ps1`)
- LiveKit server configuration (`livekit.yaml`)
- Docker Compose orchestration

---

## Version History

- **Unreleased**: UI overhaul, video testing, logging, multi-room support
- **0.1.0**: Initial release with core conferencing and AI agent features
