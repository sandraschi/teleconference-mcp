# Installation Guide

## Prerequisites

| Dependency | Version | Purpose |
|------------|---------|---------|
| Python | 3.12+ | MCP servers, AI agent, backend |
| Node.js | 18+ | Next.js dashboard |
| Docker | 24.0+ | LiveKit server, Redis |
| Ollama | latest | Local LLM inference |

## Step 1: Clone & Setup

```powershell
git clone https://github.com/sandraschi/teleconference-mcp.git
cd teleconference-mcp
```

Install Python dependencies:

```powershell
uv sync
```

Install Node dependencies (includes `@livekit/track-processors` for background blur):

```powershell
npm install
```

## Step 2: Start Infrastructure

```powershell
docker compose up -d livekit redis
```

This starts:
- **LiveKit** (WebRTC SFU) on ports 15580–15582
- **Redis** (state bus) on port 16379

## Step 3: Install Ollama Models

The AI agent needs a local LLM. [Install Ollama](https://ollama.com/download), then:

```powershell
ollama pull gemma2
```

The agent uses `gemma2` by default. Configure via `OLLAMA_MODEL` env var.

## Step 4: Configure Environment

```powershell
# apps/web/.env.local (optional, defaults work for dev)
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:15580
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

## Step 5: Launch Services

### Start everything:

```powershell
.\start.ps1 all
```

### Or start individual services:

```powershell
uv run -m teleconference_mcp conferencing   # MCP server (port 10720)
uv run -m teleconference_mcp remoting       # Remoting MCP (port 10725)
uv run -m teleconference_mcp agent          # AI agent (port 10887)
uv run -m teleconference_mcp web            # Dashboard (port 10886)
```

### Using Just:

```powershell
just web        # Dashboard
just agent      # AI agent
just conferencing   # MCP server
just remoting       # Remoting MCP
```

## Docker Full Stack

Build and start all 8 containers:

```powershell
docker compose -f docker-compose.yaml -f docker-compose.observability.yaml up -d --build
```

This builds and starts: LiveKit, Redis, Web (port 15500), Agent, Prometheus (19090), Loki (13100), Grafana (13000), Promtail.

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Dashboard | http://localhost:15500 | — |
| Grafana | http://localhost:13000 | admin / admin |
| Prometheus | http://localhost:19090 | — |

### Observability

- **Grafana** is auto-provisioned with Prometheus + Loki datasources
- **Prometheus** scrapes: LiveKit, conferencing-mcp, remoting-mcp, web dashboard, agent, Redis
- **Loki** receives logs from all containers via Promtail
- Metrics endpoints: `/metrics` on MCP servers, `/api/metrics` on web dashboard

### Without Observability

```powershell
docker compose -f docker-compose.yaml up -d --build
```

Starts: LiveKit, Redis, Web (port 15500), Agent. No monitoring stack.

> **Note**: Ollama runs outside Docker on your PC. The agent reaches it via `host.docker.internal:11434`.

## First-Time Setup

Run the automated setup script:

```powershell
.\setup.ps1
```

This detects missing dependencies and installs everything needed.

## Verify Installation

```powershell
# Check health
curl http://localhost:10720/mcp

# Run tests
uv run pytest tests/ -v
```

All 44 tests should pass.

---

## Troubleshooting

| Problem | Check |
|---------|-------|
| `uv run -m teleconference_mcp` fails | Run `uv sync` first |
| LiveKit unreachable | `docker compose ps` to verify containers |
| Ollama not responding | `ollama serve` and `ollama list` |
| Port conflicts | Check `netstat -ano \| findstr :10886` and kill zombie processes |
| Agent can't connect | Verify `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` match `livekit.yaml` |
| No audio/video | Check browser permissions at `http://localhost:10886/test` |

