# Teleconference MCP (AG-Visio / Teams++)

<p align="center">
  <a href="https://github.com/casey/just"><img src="https://img.shields.io/badge/just-ready_to_go-7c5cfc?style=flat-square&logo=just&logoColor=white" alt="Just"></a>
  <a href="https://github.com/astral-sh/ruff"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json" alt="Ruff"></a>
  <a href="https://python.org"><img src="https://img.shields.io/badge/Python-3.13+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"></a>
  <a href="https://github.com/PrefectHQ/fastmcp"><img src="https://img.shields.io/badge/FastMCP-3.2-7c5cfc?style=flat-square" alt="FastMCP"></a>
</p>

[![CI](https://github.com/sandraschi/teleconference-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/sandraschi/teleconference-mcp/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/badge/docker-8%20containers-2496ed?logo=docker)](https://docker.com)
[![Grafana](https://img.shields.io/badge/observability-grafana%2Bprometheus%2Bloki-orange)](docs/FEATURES.md)

**Self-hosted, AI-powered video conferencing** — a privacy-respecting alternative to Zoom/Teams with a local-first AI voice assistant, real-time screen sharing, RAG memory, remote desktop, and full observability stack.

---

## Quick Start

```powershell
git clone https://github.com/sandraschi/teleconference-mcp
cd teleconference-mcp
just
```

This opens an interactive dashboard showing all available commands. Run `just bootstrap` to install dependencies, then `just serve` or `just dev` to start.

### Manual Setup

If you don't have `just` installed:
git clone https://github.com/sandraschi/teleconference-mcp.git
cd teleconference-mcp
uv sync
npm install
docker compose -f docker-compose.yaml -f docker-compose.observability.yaml up -d
.\start.ps1 all
> **Prerequisites**: [Python 3.12+](https://python.org), [Node.js 18+](https://nodejs.org), [Docker](https://docker.com), [Ollama](https://ollama.com)

## Documentation

| Guide | Description |
|-------|-------------|
| **[Installation](docs/INSTALL.md)** | Full setup guide: prerequisites, Docker, Ollama, config |
| **[Architecture](docs/ARCHITECTURE.md)** | System design: services, ports, data flow, MCP discovery |
| **[LiveKit](docs/LIVEKIT.md)** | WebRTC infrastructure: server config, STUN, room management |
| **[Features](docs/FEATURES.md)** | All capabilities: conferencing, AI agent, remoting, memory, contacts, observability |
| **[Usage](docs/USAGE.md)** | User manual: dashboard, settings, agent interaction, Docker, observability |
| **[Contributing](CONTRIBUTING.md)** | Development standards: Ruff, tests, CI/CD, PR process |
| **[Technical Reference](TECHNICAL.md)** | Deep-dive into protocol details and internals |
| **[Changelog](CHANGELOG.md)** | Version history from 0.1.0 to 2.1.0 |

---

## At a Glance

```
┌─────────────────────────────────────────────────────┐
│              Docker Stack (8 containers)             │
│                                                      │
│  Browser (10886/15500) ←→ LiveKit SFU (15580)       │
│       │                            │                 │
│       ├── Redis (16379)            └── Agent (10887) │
│       │                                │             │
│       ├── conferencing-mcp (10720)     ├── Ollama    │
│       ├── remoting-mcp (10725)         ├── LanceDB   │
│       │                                └── MCP Disc  │
│       │                                              │
│       └── Observability Stack:                       │
│            Prometheus (19090) → Grafana (13000)      │
│            Promtail → Loki (13100)                   │
└─────────────────────────────────────────────────────┘
```

---

## Key Capabilities

| Feature | Stack | Status |
|---------|-------|--------|
| Video conferencing | LiveKit WebRTC + Next.js 16 | ✅ |
| AI voice assistant | Ollama + Whisper (OpenAI) + Piper | ✅ |
| Multi-participant transcription | Independent STT per audio track | ✅ |
| Meeting summaries | FastMCP 3.2 sampling + LanceDB | ✅ |
| Screen capture share | mss + LiveKit tracks | ✅ |
| Screen sharing (browser) | getDisplayMedia + LiveKit track | ✅ |
| Remote mouse/keyboard | pynput + pynput | ✅ |
| RAG memory | LanceDB + FastEmbed (384-dim) | ✅ |
| Contact management | Windows COM + local users | ✅ |
| Screen reading OCR | UIAutomation COM | ✅ |
| Conference scheduling | SQLite + LiveKit API | ✅ |
| Meeting recording | LiveKit Egress API | ✅ |
| Background blur | @livekit/track-processors | ✅ |
| File sharing | HTTP upload + data channel broadcast | ✅ |
| Chat panel | LiveKit useChat | ✅ |
| OIDC auth | Authentik via next-auth v5 | ✅ |
| Guest join | /join/[room] one-click page | ✅ |
| PWA support | Web manifest + SVG icon | ✅ |
| Mobile responsive | TailwindCSS breakpoints | ✅ |
| Health monitoring | TCP probe + Ollama check | ✅ |
| Prometheus metrics | /metrics on all services | ✅ |
| Grafana dashboards | Auto-provisioned + Loki logs | ✅ |
| Tests | 63 Python + 27 frontend + 13 E2E | ✅ |

---

## Port Map

| Service | Dev Port | Docker Port |
|---------|----------|-------------|
| Web dashboard | 10886 | 15500 |
| AI agent | 10887 | (container) |
| Conferencing MCP | 10720 | (dev only) |
| Conferencing health | 10721 | (dev only) |
| Remoting MCP | 10725 | (dev only, Win) |
| MCP discovery | 10700–10800 | — |
| LiveKit WS | 15580 | 15580 |
| LiveKit WebRTC | 15581 | 15581 |
| LiveKit UDP | 15582 | 15582 |
| Redis | 16379 | 16379 |
| **Grafana** | — | **13000** |
| **Loki** | — | **13100** |
| **Prometheus** | — | **19090** |

---

## Running the Stack

```powershell
# Full stack (all 8 containers)
docker compose -f docker-compose.yaml -f docker-compose.observability.yaml up -d

# Core only (no observability)
docker compose -f docker-compose.yaml up -d

# Development (local processes, Docker infra only)
docker compose up -d livekit redis
.\start.ps1 all
```

### Access Points
| Service | URL |
|---------|-----|
| Dashboard | http://localhost:15500 |
| Health | http://localhost:15500/health |
| Guest join | http://localhost:15500/join/room-name |
| Meetings | http://localhost:15500/meetings |
| Files | http://localhost:15500/files |
| **Grafana** | http://localhost:13000 (admin/admin) |
| **Prometheus** | http://localhost:19090 |
| **LiveKit** | http://localhost:15580 |

---

## License

MIT — see [LICENSE](LICENSE).

