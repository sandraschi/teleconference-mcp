# AG-Visio User Guide (teleconference-mcp)

Self-hosted video conferencing with an AI voice assistant. Everything runs on your
own hardware: video/audio through a local LiveKit server, the AI through Ollama
(free, local) with optional cloud voices, the dashboard in your browser. No accounts
except the ones you choose (cloud LLM keys, Authentik SSO if enabled).

## 1. Get running in 15 minutes

You need: Windows 10/11 (fleet setup) or Docker, Python 3.12+, Node.js 22+,
Ollama with `gemma2` pulled. Steps:

1. Clone and enter the repo. Run `just bootstrap` (installs Python + Node deps and
   the pre-commit hook) or follow `INSTALL.md` for manual setup.
2. Start the media server: on fleet Windows it already runs as the `LiveKitSFU`
   service — verify with `sc.exe query LiveKitSFU` (must say RUNNING). Elsewhere:
   install LiveKit and point it at `livekit.yaml`. Never run a second LiveKit in
   Docker on port 15580 — two servers fight over the port and both die.
3. Start the stack: `.\start.ps1` (opens the dashboard), or `just serve` (no
   browser), or `.\start.ps1 -BackendOnly` / `-FrontendOnly` for parts. The launcher
   waits for the backend health check before opening anything.
4. Open `http://localhost:10886`. Type a room name and your name, press Join Room,
   allow camera/mic. You should see yourself. Open a second browser window (or the
   guest link) to see two tiles.
5. Start the voice agent (`just agent`): it joins the room and says it is
   operational. Ask it to summarize — check the transcript panel.

What it costs: local path (LiveKit + Ollama + this repo) is free, no accounts.
Cloud voices need provider keys (OpenAI/DeepSeek/OpenRouter/Anthropic/Meta) pasted
in Settings → LLM Providers; keys stay in a server-side keystore, never in the
browser. If the agent joins but never speaks, Ollama is the first suspect: `ollama
serve` running? `gemma2` pulled? Reachable at `OLLAMA_HOST` (default
`http://localhost:11434`)?

## 2. Dashboard tour

Landing (`/`): join card (room select or custom name, your name, Join Room button,
Camera & Audio test link), plus a hero area describing the product with links to
Tools, Schedule, and Health. After joining: video grid, control bar (mic, camera,
screen share, leave), recording button, background blur toggle, and a right sidebar
with tabs — Transcript (live captions), Chat (in-call messages over the LiveKit
data channel), Remote (remote-desktop panel), Fleet (peer agents), Files (shared
files), Contacts, Intelligence (summaries, action items, translation).

Meetings (`/meetings`): scheduled conferences — create (title, date/time, room),
upcoming list, edit, cancel. Schedule (`/schedule`): calendar-style planning view.
Recordings (`/recordings`): finished MP4s with playback. Files (`/files`): uploads
shared to the room (50MB cap per file) with download links. Tools (`/tools`):
every MCP tool with per-tool invoke and expandable schemas, plus a refresh button.
Health (`/health`): backend/health/LiveKit status with refresh. Settings
(`/settings`): media devices, LiveKit URL, LLM providers and keys, theme, telemetry
toggle. Test (`/test`): camera/mic/speaker checks before important calls. Guest join
(`/join/[room]`): one-click link for outsiders — name + join, no account.

Keyboard: Ctrl+= / Ctrl+- zoom, Ctrl+0 reset (persisted). Every data page shows
loading spinners, empty states with guidance, and error states with retry.

## 3. Everyday flows

**Schedule then meet:** Meetings → New (title, date/time, room) → invite by email or
username with a role (HOST runs the room, PARTICIPANT joins fully, OBSERVER gets
transcripts without publishing) → share the guest link. At start time create the
room (same slug), join, `notify_conference_active` so recording hooks arm.

**Record and remember:** press record (verify egress storage is writable BEFORE the
meeting), end the call, find the MP4 under Recordings, ask the agent (or the
`generate_meeting_summary` tool) for a summary and `extract_action_items` — confirm
owners with the organizer, they are guesses.

**Share screen / present:** in-call Screen Share control (browser) or the remoting
sidecar for full-desktop capture. Remote control (mouse/keyboard) requires the
remote user visibly joined with the overlay up — never silent.

**Files:** upload in the Files tab (50MB max), broadcast goes to the room
automatically, download from the list or the shared-files feed.

**Find things later:** search notes and transcripts by keyword; semantic search for
meaning; the default vault view shows recent items — empty search plus Enter lists
the full index.

## 4. The voice agent

The agent joins like a participant: greet it by name, speak normally, ask for
summaries, action items, translations, or room operations ("mute everyone", "start
recording" — it uses the same MCP tools you would). It needs: Ollama reachable with
a pulled model (default `gemma2`), mic audio flowing (check `/test`), and a room
with it invited. Cloud mode (`AGENT_MODE=cloud` + provider keys) swaps Ollama for
hosted speech — better voices, metered cost. If it joins but stays mute: Ollama,
then model, then STT errors in the agent log, in that order.

## 5. Settings that matter

Media: input/output devices per browser profile; test page before board meetings.
LiveKit URL: default `ws://localhost:15580`; change only if your SFU moved (then
update every client the same day). LLM providers: local Ollama (auto-detected,
free) vs cloud cards (paste key → Test → select model); selection persists per
browser. Theme: dark (default), light, system. Telemetry: on/off (local only).
Auth: Authentik SSO when configured; dev bypass exists and must never be on in
production (`AUTH_DISABLED=true` sightings are incidents).

## 6. Troubleshooting FAQ

**Dashboard says backend offline:** backend process down (`:10887/health` in a new
tab should read `{"status":"ok"}`) or stale cached bundle (Ctrl+F5) or wrong origin
(use `http://127.0.0.1:10886`, not a preview URL). **Launcher flashes and dies:**
read the window — usually a held port or a missing helper; run with `-BackendOnly`
to isolate. **`start.ps1` starts stdio mumbling:** update (fixed 2026-09-23, needs
`--serve` path). **Join spins forever:** LiveKit down (`sc.exe query LiveKitSFU`),
wrong URL, or ad-blocker killing WebSocket. **No camera/mic:** browser permissions,
then `/test`, then another browser. **Echo:** one open mic per room, headphones on.
**Token rejected:** API key/secret mismatch between `livekit.yaml`, web env, and
compose defaults — all three must agree. **Agent mute:** Ollama chain (above).
**Recordings missing:** egress path writable? Egress API configured? **Transcripts
empty:** Whisper reachable? Per-track STT needs the agent present. **Search finds
nothing:** index rebuilding (Stats page) or wrong project scope. **Port bind
failure:** `Get-NetTCPConnection -LocalPort <port>` names the holder — never kill
blindly (the old remoting launcher killed strangers). **Auth loop:** callback URL
registered in Authentik? Clock skew? Dev bypass accidentally on?

## 7. Ports, URLs, and environment (one page)

Ports: 10886 web, 10887 backend (`/mcp`, `/health`, `/api/shutdown`), 10891
health/diag/metrics, 11069 remoting SSE, 15580–15582 LiveKit (native service),
16379 redis (docker, optional), 19090/13000/13100 observability (docker, optional).
URLs: dashboard `http://localhost:10886`, health `http://localhost:10891/health`,
backend `http://127.0.0.1:10887/health`, guest `http://localhost:10886/join/<room>`.
Env essentials: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (must match
`livekit.yaml`), `OLLAMA_HOST`, `OLLAMA_MODEL`, `NEXT_PUBLIC_LIVEKIT_URL`,
`NEXT_PUBLIC_BACKEND_URL`, `AUTH_*` (see `.env.example` — never commit `.env`).
Files: `livekit.yaml` (SFU), `turbo.json` (env declarations), `docker-compose.yaml`
(infra WITHOUT livekit — native owns :15580), `justfile` (`serve`, `test`, `lint`,
`typecheck`, `e2e`, `agent`, `web`, `build-web`, `build-native`, `mcpb-pack`).

## 8. MCP clients (Claude Desktop and friends)

Stdio (default): command `uv`, args `run --directory D:/Dev/repos/teleconference-mcp
python -m teleconference_mcp`, env `PYTHONUNBUFFERED=1`. HTTP: point at
`http://127.0.0.1:10887/mcp`. Remoting sidecar: SSE `http://127.0.0.1:11069`.
Thirty-one conferencing tools plus eight remoting tools appear; try `status` first
(version + green/red per endpoint), then `room_list`, then create. Agents: same
`ctx`-first conventions, correlation ids in logs, dialogic returns — `{"error"}`
means failure, always.

## 9. Backup, updates, support

Backup: SQLite files, `apps/agent/lancedb_data`, `data/files`, `livekit.yaml`,
`.env` (reconstruct from `.env.example` + keystore if lost). Updates: pull →
`uv sync` → `npm --workspace=web install` → `just test` → restart via launcher
(never taskkill). LiveKit upgrades: read the `livekit.yaml` header notes (TURN TTL,
codecs) and mirror key changes to web env + compose defaults same-day. Files to
never touch: `.venv/`, `node_modules/`, `.next/`, `*.db` in git. Help: in-app Help
modal, `docs/` (ONBOARDING → TROUBLESHOOTING → LIVEKIT), `reports/` for audit
history, and the `status` tool before asking a human — paste its output with the
question.

## 10. Page-by-page walkthrough

**Landing.** The join card is the whole product in miniature: room select (suggested
rooms from discovery plus custom), name field (Enter submits), Join Room button
(spinner + "Connecting..." state — wait, do not double-click), Camera & Audio test
link, and a server/device strip (LiveKit URL, camera/mic OK/Fail/Pending with Retry).
Hero links jump to Tools, Schedule, Health. If the room list is empty, discovery is
down — custom names still work. If Join stays on "Connecting" past ~10 seconds, the
backend or LiveKit is down (see FAQ).

**Meetings.** New button opens the form (title, date/time picker, room, description);
Title and Date are required. Rows show status chips (upcoming/live/done), with edit
(pencil), cancel (trash, asks confirm), and copy-invite-link actions. Empty state
suggests creating the first meeting. Cancelled meetings stay visible, struck
through — history, not clutter.

**Schedule.** Calendar grid fed by the same conference rows. Click a day to
prefill the form. Recurring meetings are separate rows (no recurrence rules — one
row per instance keeps transcripts attributable).

**Recordings.** Cards with duration, room, date, playback, download, delete (confirm).
If a finished meeting has no card, egress never ran: check the agent log and the
Egress API section of TROUBLESHOOTING.

**Files.** Drag-and-drop zone (dashed border, dark themed) plus picker; 50MB cap
with a clear error over it; list with uploader, size, time, download, delete.
Uploads broadcast to the room over the data channel so participants see them live.
Empty state says "No files shared yet" with an upload call to action.

**Schedule/Tools/Health/Settings/Test.** Tools page: search box, per-tool cards with
parameter schemas (expandable), invoke buttons with running spinners, result panes,
refresh. Health: backend/health/LiveKit/dot indicators with refresh and a link to
full diagnostics (`:10891`). Settings: media device dropdowns (populated from the
browser — grant permission first), LiveKit URL field, theme, telemetry, LLM provider
cards (local Ollama status vs cloud key entry + Test buttons + model dropdowns),
save/reset with dirty-state indication. Test: camera preview, mic level meter,
speaker test tone, join-readiness verdict.

**Guest join.** Minimal by design: room name shown, name field, join button, same
device checks inline. Guests never see settings, tools, or diagnostics. If a guest
can't join, 9 times in 10 it is the token endpoint (identity missing → 400) or their
browser blocking camera — the error text says which.

**Auth pages.** Sign-in lists Authentik (when configured) plus dev bypass note;
error page explains callback mismatch and clock skew in plain language.

## 11. Role guides

**Host (you, probably).** Create the room, open with the agent invited, admit from
the lobby if enabled, run the agenda, mute noisemakers (mute first, kick for
disruption, delete room to end for everyone). After: recording check, summary +
action items, cancel no-shows.

**Participant.** Join via link, check devices on `/test` first for important calls,
keep one mic open per room, use chat for links (it persists in transcript), share
files through Files (not screen photos of files).

**Observer.** Read-only presence for transcripts; no publish rights — if you need to
speak, ask the host to re-invite as participant.

**Guest.** Nothing to install, no account. Chrome/Edge recommended; Safari works
with explicit permission prompts. Corporate VPNs sometimes block UDP — fall back to
TURN (contact the host) or a phone hotspot to test.

**Agent operator.** `just agent`, watch it join, give it the agenda ("you are
minuting; flag decisions"), correct it live ("no, the owner is Maria, not Mario" —
corrections persist), dismiss it with leave when done. Cloud mode for board-grade
voices; local mode for everything else.

## 12b. Advanced agent workflows (Claude/Cursor/opencode)

Thirty-one conferencing tools plus eight remoting tools are callable by any agent
session — the same surface as the dashboard, scriptable. Patterns that work: **pre-
brief** (`conference_get` + participant list + last summary → agenda in chat before
start); **live assist** (agent in-room minuting while you chair — corrections win
over re-runs); **post-op** (summary → action items with owners → calendar entries,
one chain, same correlation id); **forensics** (`query_system_logs` →
`sample_log_analysis` → `sample_system_forensics` only if the first two disagree);
**fleet check** (`status` → per-endpoint greens, paste output when asking humans);
**remote hands** (`get_status` → resolution → move/click/type with explicit
confirmation each destructive step — input injection never runs unattended).
`ctx`-first conventions and correlation ids mean multi-step agent runs stay
attributable in logs. Rate limits: data-channel messages stay small (files go via
`/api/files`, never base64 in chat); summary calls carry full transcripts (truncate
past ~100k chars with a note, don't silently clip); background sweeps (diagnostics,
reindex) run async — poll, don't re-trigger.

## 12. Meeting templates that work

**Standup (15 min):** room `standup-<date>`, agent present, round-robin (yesterday /
today / blockers), `extract_action_items` at minute 13, summary posted to chat.
**Planning (60 min):** agenda in description, screen share for the board, decisions
dictated aloud for the transcript ("decision: we ship Thursday"), summary + owners
within the hour. **1:1 (30 min):** observer-free (privacy), no recording unless both
agree, summary to the vault only. **Interview (45 min):** guest link, waiting room
if enabled, record with explicit consent stated on transcript, scorecard right after
while memory is fresh. **Webinar (60+ min):** observers for audience, chat for Q&A,
a second operator on mute duty, recording mandatory, publish MP4 + summary next day.
**Incident (open-ended):** war-room slug, agent minuting everything, `notify` the
on-call channel, timeline from transcript beats memory every time.

## 13. Accessibility, mobile, and devices

Keyboard: Tab order follows the visual order (join card → controls → sidebar);
Ctrl+=/-/0 zoom persists; all buttons real `<button>`s with labels. Screen readers:
tiles expose participant names, status dots have text equivalents, spinners announce
via live regions. Mobile: responsive layout, tiles stack, controls collapse;
guest-join works best (no settings needed); grant camera/mic at the OS level first
(iOS: Settings → browser → camera). Devices: USB headsets beat laptop mics; HDMI
cameras beat built-ins; test page before board meetings; Bluetooth adds ~200ms —
fine for listening, bad for rapid back-and-forth. Low bandwidth: turn off incoming
video (audio-first), disable blur (GPU-heavy), close the recordings tab (no
background egress polling).

## 14. Recordings management

Egress writes MP4 per config (path + template in Egress API settings — verify
writable before important meetings, not after). Retention: decide per series
(standups 30 days, board meetings 7 years — check your policy). Naming:
`<room>-<date>-<take>.mp4`, never `final-final.mp4`. Sharing: download + hand over,
or publish from Recordings (access follows room visibility). Deletion: confirm
dialog, permanent — export the transcript first (transcripts outlive video).
Transcripts: per-track STT merged, speaker-labeled, timestamped; corrections via
edit flow, never by hand-editing MP4s. If a recording must not exist (privileged
1:1s), disable egress for that room beforehand — deleting after the fact is
forensics, not privacy.

## 15. Admin guide (multi-user, SSO, TURN, scaling)

**Users and roles.** Authentik OIDC when configured (issuer/id/secret in env,
callback `http://localhost:10886/api/auth/callback/authentik` registered provider-
side); dev bypass exists for bring-up and must be off in any shared deployment
(grep `AUTH_DISABLED` in deploys — `true` is an incident). Roles map HOST →
room admin, PARTICIPANT → publish, OBSERVER → subscribe+transcript. Guests bypass
accounts entirely by design (token-scoped, room-bound, expiring).

**Network.** LAN: clients reach the host by name/IP — set `NEXT_PUBLIC_*` URLs to
the LAN address at build time (they bake in). Tailscale: works, CORS regex covers
`100.x` peers; UDP hole-punching usually succeeds, else TURN. Corporate VPNs that
block UDP need TURN with credentials (rotate `turn.secret` regularly; v1.13 made
TTL mandatory). Ports to open for guests: 15580 TCP, 15581-15582 TCP, 50000-60000
UDP, 10886 TCP. Reverse proxy: terminate TLS at Traefik/Caddy, forward websockets
intact (LiveKit WS breaks on buffering proxies — disable request buffering for
`/join` and signalling paths).

**Scaling.** One room per LiveKit instance is comfortable into the dozens of
participants; observers scale further (no publish load). Multi-host: single SFU
first (this setup), region-split only when latency demands it — one more SFU is an
ops project, not a config line. Redis becomes mandatory (not optional) past one
agent host. LanceDB compacts on reindex; schedule it weekly off-hours. Backups run
before upgrades, always: DB files, `lancedb_data`, `data/files`, `livekit.yaml`,
env (reconstructable from `.env.example` + keystore, but snapshot anyway).

**Monitoring.** `:10891` health + `/api/v1/diagnostics` + `/metrics` feed the
fleet Prometheus/Grafana/Loki stack (compose observability file). Alert on:
backend down, LiveKit down, egress failures, disk >85% (recordings!), cert expiry
(reverse proxy), `AUTH_DISABLED=true` anywhere. The `status` tool is the human
equivalent — paste its output with every support request.

## 16. Extended FAQ (20)

1. Free forever? Local path yes; cloud voices metered.
2. Accounts needed? None for local + guests; cloud keys optional; SSO optional.
3. Works offline? LAN yes (no internet dependency except cloud voices/STT models
   already pulled); TURN over internet for remote guests.
4. Browsers? Chrome/Edge best, Firefox good, Safari permission-heavy but working.
5. Phone/tablet? Guest join yes; hosting from mobile works, presenting doesn't.
6. Max participants? Dozens publishers, more observers; test with `/test` + a dry run.
7. Recording consent? Your policy + stated on transcript; tooling won't decide for you.
8. Where do MP4s live? Egress path config — verify writable pre-meeting.
9. Transcript languages? Whisper multilingual; set room language for accuracy.
10. Translation? `set_translation_language`, per-room default.
11. Share system audio? Screen-share with audio track enabled (browser-dependent).
12. Two mics, one room? Mute one — feedback is physics, not software.
13. VPN blocks everything? TURN credentials, or hotspot to isolate.
14. Forgot to record? Transcript may still exist (agent present) — MP4 won't.
15. Wrong person host? Re-invite with HOST role; roles are per-invitation.
16. Room name taken? Slugs are unique — suffix with date.
17. Agent talks over people? VAD tuning + explicit "hold questions" instruction.
18. Summary wrong owner? Correct live (persists) or edit flow after.
19. Files over 50MB? Split or external link in chat (limit is server config).
20. Everything down Monday 9am? Services restart order: LiveKitSFU → backend →
   web → agent; `status` tool, then logs, then human.

## 17. Checklists

**Pre-meeting (host, 5 min):** backend green (`:10887/health`)? LiveKit service
running? Egress writable (if recording)? Agent invited? Agenda in description?
Guest link tested in a private window? Devices on `/test`? Backup plan if VPN
blocks UDP (hotspot/TURN)? **Post-meeting (5 min):** recording present? Summary +
owners done? No-shows cancelled? Room deleted (or kept deliberately)? Files
downloaded by who needs them? Agent dismissed? **Weekly ops (admin, 15 min):**
disk under 85%? Reindex done? Backups verified (restore one file, don't trust
timestamps)? Key rotation due? Dependency updates (`uv sync`, npm, `just test`)?
Stale rooms deleted? Watch the sync/status pages for red that everyone normalized
— normalized red is how outages start.

## 18. Migrating and integrating

From Zoom/Meet/Teams: export recordings + transcripts first (this system imports
MP4/metadata, not their clouds); recreate recurring series as instances; re-issue
guest links (old links die with old rooms); train hosts on mute-first etiquette
(platforms differ, physics doesn't). Calendar integration: conference rows carry
ISO-8601 UTC + organizer + description — sync scripts read those fields; keep them
clean. Webhooks out (room started/finished, recording ready, transcript done) feed
ticketing/chatops — ask for the receiver list before enabling (noisy defaults
help nobody). API consumers: prefer MCP tools over raw REST (versioned, logged,
correlation ids); raw REST is for the dashboard, not integrations. Embedding in
intranets: iframe the guest-join page (auth handled by token), never the admin
pages. Data retention: define per series (standups 30d, board 7y), enforce by
scheduled delete (manual deletion doesn't scale), export transcripts before video
purges. Exit strategy: everything is SQLite + MP4 + markdown + standard env —
leaving costs a copy command, which is the point of self-hosting.

## 19. Glossary (plain language)

SFU (Selective Forwarding Unit): the LiveKit server — routes video without
re-encoding (cheap, fast). Room: a live session; ephemeral. Conference: the
planned event (durable row). Track: one audio/video stream. Publish: sending your
media. Subscribe: receiving. Egress: server-side recording to MP4. Ingress: pulling
external streams in (rarely used here). Data channel: sideband messaging (chat,
file pings, polls) — tiny payloads only. Token: short-lived signed pass (identity
+ grants + expiry). STT: speech-to-text (Whisper). TTS: text-to-speech (Piper
local, cloud options). VAD: voice activity detection (who's talking). OBSERVER:
transcript-only role. Correlation id: per-operation trace tag across logs. Dialogic:
success/message/data return shape. Substrate: SQLite + LanceDB memory. Heartbeat:
liveness signal. Discovery: LAN room/suggestion feed. Forensics: LLM log analysis.
Portmanteau: one tool with an operation switch (fleet pattern). Smoke test: automated
click-through proving the build works. Reindex: rebuild search tables from source
(slow, background, do not interrupt).

## 20. Your first week (a plan)

Day 1: install, join test, `/test` devices, one 1:1 call. Day 2: schedule a real
standup, invite the team, record it, read the summary — fix whatever annoyed you
(devices, names, room slug). Day 3: guest link to an outsider (the real
compatibility test), files tab with a real deck, chat for links. Day 4: agent as
minuter for one meeting (correct it twice — feel the loop), action items to owners.
Day 5: review recordings + transcripts, set retention, write down your personal
cheat sheet (rooms, links, keys), delete the test rooms. Weekend: do nothing —
Monday you will know whether anything is red, and the `status` tool will tell you
in one line. Week 2: Authentik if you need SSO, cloud voice if local bores you,
observability compose if you like graphs, backup restore drill (one file) before
you need it for real.

## 21. Shortcuts and power moves

`Ctrl+=` / `Ctrl+-` zoom, `Ctrl+0` reset (persisted). `Enter` submits name/room
forms. Paste email lists into invite (comma-separated supported). Drag files
anywhere onto Files. `/test` before important calls (bookmark it). `status` tool
before asking humans. Guest link format memorized: `/join/<slug>`. Room slugs
lowercase-dashed (guests type them). Keep one "always" room for drop-ins. Name
recordings before stopping (post-hoc renames lose the transcript link). Star the
health page (you will open it weekly). Pin the keystore backup with the DB backup
(one without the other is half a restore).

## 22. Symptom deep-dives (when the FAQ is not enough)

**Join spins past 10 seconds.** Open `:10887/health` and `:15580` in new tabs. Both
green but still spinning: ad-blocker or VPN killing WebSocket — try private window,
then hotspot. Backend red: `start.ps1 -BackendOnly`, watch for port-held errors
(`Get-NetTCPConnection -LocalPort 10887` names the squatter). LiveKit red:
`sc.exe query LiveKitSFU` — START_PENDING loop means a port fight (docker impostor
pattern, 2026-09-22); RUNNING but unreachable means firewall or wrong URL.

**Guest sees black tiles.** Their publish failed: permissions (OS-level first,
browser second), then another app holding the camera (Teams in background is the
classic), then hardware. Ask for the `/test` verdict verbatim — it distinguishes
all three.

**Audio robots/metallic.** CPU saturated (blur + 20 tiles + software encode):
disable blur, incoming video off, close recordings tab. Persistent on one user:
their mic at 8kHz (Bluetooth hands-free profile — switch to stereo/A2DP + separate
mic). Everyone robotic: network (packet loss) — wired test settles it.

**Transcript attributes wrong speaker.** Per-track STT maps tracks to identities at
join; re-joins mid-call reshuffle. Fix: correct once (persists for the meeting),
and keep display names stable (Guest_4f2a twice in one room confuses everyone
including the model).

**Summary hallucinates decisions.** It drafts from transcript only — side
conversations in chat are invisible to it. Feed decisions explicitly ("decision for
the minutes: ...") or paste chat excerpts into the summary prompt.

**Uploads stall.** Over 50MB (server cap — split first), filename with `#?%`
characters (rename), disk full on host (recordings eat gigabytes silently), or the
`data/files` path unwritable (service account permissions after reinstalls).

**Auth loops back to sign-in.** Callback URL mismatch (exact string, trailing
slashes kill), clock skew over 5 minutes (Kerberos/OIDC both hate it), dev bypass
accidentally on (everyone lands signed-in as dev — check env, treat as incident),
Authentik provider paused (its own dashboard first).

**Everything slow at 9am Monday.** Cold caches + reindex + backup overlap. Stagger:
backups 3am, reindex Sunday, services already warm (they run 24/7 — do not nightly
restart "to be safe", you will just move the slowness to 9am).

## 23. Operator CLI reference

`just serve` (stack, no browser), `just agent` (voice agent), `just web`
(production web), `just build-web`, `just test` (pytest), `just typecheck`
(mypy), `just lint` / `just fix` (ruff), `just e2e` (Playwright, backend+frontend
booted), `just check-sec` (bandit), `just audit-deps` (safety), `just mcpb-pack`
(bundle), `just build-native[-debug]` (Tauri NSIS), `just bootstrap` (deps +
hooks), `just clean` (caches). Direct: `uv run python -m teleconference_mcp
--serve` (backend), `... remoting` (sidecar :11069), `... agent`, `... web`;
`.\start.ps1 [-BackendOnly] [-FrontendOnly] [-NoBrowser]`; `sc.exe query|start|
stop LiveKitSFU`; `docker compose up -d redis` (infra only — never livekit);
`npx tsc --noEmit -p apps/web`; `npm run lint --workspace=web`. Probes:
`:10887/health`, `:10891/health`, `:10891/api/v1/diagnostics`, `status` tool.
Never: taskkill service children, `docker compose up livekit`, hand-edit
`prometheus.yml`-style generated files, commit `.env`/`node_modules`/`.venv`.

## 24. Town halls and big rooms

Over ~25 publishers: switch the audience to OBSERVER (transcripts keep them
included, publish load vanishes), spotlight presenters (pinned tiles, rest
audio-only), disable blur globally for the event, pre-record the deck walkthrough
as backup (live demos fail on stage, always), second operator on mute/chat duty,
recording on from minute zero (you cannot retro-record), Q&A via chat triage
(upvote by react, answer top five live, rest async from transcript). Dry run with
three friends in the actual room slug the day before. After: MP4 + summary +
action items within 24 hours while context is warm, or it never ships.

## 25. More answers (second FAQ round)

21. Two cameras? USB switch in `/test`; presenters use HDMI capture as a camera.
22. Share with audio? Enable the audio checkbox in the share picker (Chrome/Edge).
23. Phone as mic? Join muted from phone for audio, desktop for video (name them
Phone/Desk so transcripts stay sane).
24. Interpreters? Second audio via `set_translation_language` + interpreter track.
25. Breakouts? Separate rooms (no sub-room primitive) with staggered returns.
26. Polls? Chat + `room_send_data` (small payloads); read results back aloud.
27. Whiteboard? Screen-share a drawing app (no native board yet).
28. Waiting room? Guest link + host admits; latecomers wait visibly.
29. Bandwidth floor? ~1.5 Mbps up for decent video, 100 kbps audio-only fallback.
30. Self-host cost? Power + disk; cloud voices are the only meter.

## 26. Feedback, contributing, staying current

Bugs: reproduce first (room slug, time, `status` output, browser console lines),
then file with those four attached — reports without them go to the back of the
queue. Feature asks: describe the meeting it would improve, not the button you
imagine. Docs fixes: same bar as code (exact file, exact line, proposed wording).
Updates: watch CHANGELOG.md (Unreleased section shows what is landing), pull
weekly, run the gates before Monday meetings. Deprecations: announced one release
ahead in CHANGELOG + migration note in TROUBLESHOOTING; nothing is removed
silently. If this guide helped, the highest-leverage contribution is a corrected
timestamp, a sharper FAQ answer, or a deleted stale paragraph — freshness beats
volume, and this file grows only by staying true.

Keep this guide beside the dashboard, not buried in a wiki.
