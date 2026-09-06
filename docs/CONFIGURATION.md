# Configuration

All knobs in one place. Copy `.env.example` to `.env` and override what you need.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LIVEKIT_URL` | `ws://localhost:15580` | SFU WebSocket URL (agent + web) |
| `LIVEKIT_API_KEY` | `devkey` | Must match `livekit.yaml` keys |
| `LIVEKIT_API_SECRET` | (see `.env.example`) | Must match `livekit.yaml`; rotate in production. **Dev default everywhere (web routes, compose, helper) is the yaml value — if you change the yaml, set the env to match or every API call 401s** |
| `NEXT_PUBLIC_LIVEKIT_URL` | `ws://localhost:15580` | Public SFU URL baked into the web client |
| `MCP_PORT` / `MCP_HOST` | `10887` / `127.0.0.1` | Conferencing backend (FastMCP HTTP) listen address |
| `HEALTH_PORT` | `10891` | Health/diagnostics/metrics + LLM provider proxy listen port |
| `TELECONF_DATA_DIR` | `<repo>/data` | LLM keystore (`llm_keys.json`, 0600) + provider selection home |
| `MODEL_API_KEY` | — | Meta chat models via Model API (Muse Spark family) |
| `ANTHROPIC_API_KEY` | — | Anthropic cloud provider |
| `DEEPSEEK_API_KEY` | — | DeepSeek cloud provider |
| `OPENROUTER_API_KEY` | — | OpenRouter cloud provider |
| `FASTMCP_LOG_LEVEL` | `WARNING` | `DEBUG` for agent/tool tracing |
| `AGENT_MODE` | `local` | `local` (Ollama/Whisper/Piper) or `cloud` (OpenAI/Deepgram/ElevenLabs) |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API (Docker agent: `http://host.docker.internal:11434`) |
| `OLLAMA_MODEL` | `gemma2` | Agent LLM (`gemma2`, `gemma3-27b`, …) |
| `OPENAI_API_KEY` / `DEEPGRAM_API_KEY` / `ELEVEN_LABS_API_KEY` | — | Cloud mode only |
| `CLOUD_STT_PROVIDER` | `deepgram` | Cloud STT: `deepgram` (proven) or `muse` (EXPERIMENTAL — Meta Muse Voice Transcribe, bake-off only, falls back to Deepgram) |
| `META_API_KEY` | — | Muse Voice Transcribe ($0.18/hr, OpenAI-SDK-compatible endpoint) |
| `MUSE_TRANSCRIBE_MODEL` | `muse-voice-transcribe-1.0` | Model name on the Meta Model API |
| `MUSE_TRANSCRIBE_BASE_URL` | `https://api.meta.ai/v1` | Override if Meta moves the endpoint (verify in cookbook) |
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
