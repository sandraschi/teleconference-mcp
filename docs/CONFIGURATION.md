# Configuration

All knobs in one place. Copy `.env.example` to `.env` and override what you need.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LIVEKIT_URL` | `ws://localhost:15580` | SFU WebSocket URL (agent + web) |
| `LIVEKIT_API_KEY` | `devkey` | Must match `livekit.yaml` keys |
| `LIVEKIT_API_SECRET` | (see `.env.example`) | Must match `livekit.yaml`; rotate in production |
| `NEXT_PUBLIC_LIVEKIT_URL` | `ws://localhost:15580` | Public SFU URL baked into the web client |
| `MCP_PORT` / `MCP_HOST` | `10720` / `127.0.0.1` | Conferencing MCP listen address |
| `FASTMCP_LOG_LEVEL` | `WARNING` | `DEBUG` for agent/tool tracing |
| `AGENT_MODE` | `local` | `local` (Ollama/Whisper/Piper) or `cloud` (OpenAI/Deepgram/ElevenLabs) |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API (Docker agent: `http://host.docker.internal:11434`) |
| `OLLAMA_MODEL` | `gemma2` | Agent LLM (`gemma2`, `gemma3-27b`, …) |
| `OPENAI_API_KEY` / `DEEPGRAM_API_KEY` / `ELEVEN_LABS_API_KEY` | — | Cloud mode only |
| `AUTH_DISABLED` | `false` | Set `true` to skip OIDC in dev |
| `AUTH_SECRET` | — | ≥32 random chars when auth is on |
| `AUTH_AUTHENTIK_ID` / `AUTH_AUTHENTIK_SECRET` / `AUTH_AUTHENTIK_ISSUER` | — | Authentik OIDC (next-auth v5) |

## Setting Variables

In `claude_desktop_config.json` (Windows: `%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "teleconference": {
      "command": "uv",
      "args": ["--directory", "D:\\Dev\\repos\\teleconference-mcp", "run", "run_server.py"],
      "env": {
        "LIVEKIT_URL": "ws://localhost:15580",
        "LIVEKIT_API_KEY": "devkey",
        "AGENT_MODE": "local"
      }
    }
  }
}
```

## LiveKit Server (`livekit.yaml`)

Ports: WSS `15580`, RTC TCP `15581-15582`, media UDP `50000-60000`.
STUN entries are `host:port` (no `stun:` prefix). TURN is disabled by default; when enabling,
`ttl_seconds` is mandatory (server v1.13.1+ drops no-TTL creds) — see [LIVEKIT.md](LIVEKIT.md).
