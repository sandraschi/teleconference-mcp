# Installing teleconference-mcp

## Prerequisites

Install these if you don't have them already:

| Tool | Purpose | Install |
|------|---------|---------|
| Claude Desktop | Required host | [download](https://claude.ai/download) |
| Git | Clone repo (Option C/D only) | `winget install Git.Git` |
| Python + uv | Run servers (Option C/D only) | `winget install astral-sh.uv` |
| Node.js 18+ | Dashboard + mcpb CLI (Option B/C/D) | `winget install OpenJS.NodeJS` |
| Docker 24+ | LiveKit + Redis containers (Options C/D only, not needed for A/B) | [download](https://docker.com) |
| Ollama | Local LLM for the Visio agent | `winget install Ollama.Ollama`, then `ollama pull gemma2` |

> Windows: all installs via [winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/)
> macOS: use `brew install` equivalents
> Linux: use your distro package manager

LiveKit itself is never bundled. Fleet Windows uses the `LiveKitSFU` service
(`sc.exe start LiveKitSFU`). Compose in this repo does not start a second SFU.
See [docs/ONBOARDING.md](docs/ONBOARDING.md) for the
5-minute path and [docs/LIVEKIT_OVERVIEW.md](docs/LIVEKIT_OVERVIEW.md) for what LiveKit is.

## Option A — Drag and Drop (Recommended)

1. Go to [Releases](https://github.com/sandraschi/teleconference-mcp/releases/latest)
2. Download `teleconference-mcp-{version}.mcpb`
3. Open Claude Desktop → drag the file onto the window
   *Or*: Settings → MCP Servers → Install from file

## Option B — mcpb CLI

```bash
# Requires Node.js (see Prerequisites)
npx @anthropic-ai/mcpb install https://github.com/sandraschi/teleconference-mcp
```

## Option C — Manual Configuration

1. Clone: `git clone https://github.com/sandraschi/teleconference-mcp`
2. Install deps: `cd teleconference-mcp && uv sync && npm install`
3. Start Redis (LiveKit is the Windows service LiveKitSFU, not a compose service): `docker compose up -d redis`
4. Confirm the agent model is present: `ollama list` (default `llama3.1:8b`)
5. Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "teleconference": {
      "command": "uv",
      "args": ["--directory", "D:\\Dev\\repos\\teleconference-mcp", "run", "run_server.py"],
      "env": {
        "PYTHONUNBUFFERED": "1",
        "LIVEKIT_URL": "ws://localhost:15580",
        "LIVEKIT_API_KEY": "devkey"
      }
    }
  }
}
```

Config file location:
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

6. Restart Claude Desktop

## Option D — Developer Mode

For contributing or running from source with live reload.
See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). Quick version:

```powershell
uv sync
npm install
docker compose up -d redis
.\start.ps1 -NoBrowser        # or: just web / just agent / just conferencing
```

Ollama runs outside Docker on your PC; the agent reaches it via
`http://host.docker.internal:11434` (Linux: add `host-gateway`).

## Verify Installation

After installing, open Claude Desktop and type:
> "Is the LiveKit server healthy? How many rooms are active?"

You should see: a health summary with the SFU state and room list (empty on fresh install).

Web dashboard: `http://localhost:10886` (dev) or `:15500` (Docker full stack).
Run the suite: `uv run pytest tests/ -q` — all 68 tests should pass.

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for common issues.
