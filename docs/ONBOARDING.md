# Onboarding — First-Time Setup

Get from zero to a working video call in ~15 minutes. No LiveKit account needed — everything is self-hosted.

---

## What you need (and what it costs)

| Piece | Install | Money / account |
|-------|---------|-----------------|
| **LiveKit server** (media host, never bundled) | Fleet Windows: already runs as `LiveKitSFU` service. Dev/other OS: `docker compose up -d livekit` | Free, no account |
| **Ollama** (local LLM for the Visio agent) | [ollama.com/download](https://ollama.com/download), then `ollama pull gemma2` | Free, no account |
| **This repo** | `git clone https://github.com/sandraschi/teleconference-mcp` | Free |
| Cloud mode (optional) | Set `AGENT_MODE=cloud` + `OPENAI_API_KEY` / `DEEPGRAM_API_KEY` / `ELEVEN_LABS_API_KEY` | Pay-per-use, vendor accounts required |

> Pitfall: the agent reaches Ollama at `OLLAMA_HOST` (default `http://localhost:11434`). In Docker the
> agent container uses `http://host.docker.internal:11434` — on Linux add `host-gateway`. If the agent
> joins but never speaks, Ollama is the first suspect.

---

## 5-minute path (fleet Windows, service already running)

```powershell
git clone https://github.com/sandraschi/teleconference-mcp
cd teleconference-mcp
uv sync
npm install
ollama pull gemma2
.\start.ps1 all
```

Open `http://localhost:10886`, create a room, join with camera/mic. Done.

## From scratch (LiveKit not running yet)

```powershell
docker compose up -d livekit redis
.\start.ps1 all
```

Verify the SFU answers: `Test-NetConnection 127.0.0.1 -Port 15580` should succeed.

---

## Sanity check

1. Dashboard loads at `http://localhost:10886` (dev) or `:15500` (Docker).
2. Create room → join → you see yourself. Invite a second browser window — two tiles.
3. Start the agent (`just agent`): it joins and says "Agent operational."
4. Say "summarize this meeting" — check the transcript panel.

Still broken? [TROUBLESHOOTING.md](TROUBLESHOOTING.md). LiveKit background: [LIVEKIT_OVERVIEW.md](LIVEKIT_OVERVIEW.md).
