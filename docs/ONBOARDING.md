# Onboarding — First-Time Setup

Get from zero to a working video call in ~15 minutes. No LiveKit account needed — everything is self-hosted.

---

## What you need (and what it costs)

| Piece | Install | Money / account |
|-------|---------|-----------------|
| **LiveKit server** (media host, never bundled) | This fleet: Windows service `LiveKitSFU`. Do not add a second LiveKit in Docker. | Free, no account |
| **Ollama** (local LLM for the Visio agent) | [ollama.com/download](https://ollama.com/download). Default model is `llama3.1:8b` (`ollama list`) | Free, no account |
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
.\start.ps1 -NoBrowser
```

Open `http://localhost:10886`, create a room, join with camera/mic. Done.

## From scratch (LiveKit not running yet)

```powershell
# LiveKit runs NATIVELY (NSSM service LiveKitSFU) - never `docker compose up livekit`
# (a compose livekit service steals :15580 and kills the native service; removed 2026-09-23).
sc.exe start LiveKitSFU
docker compose up -d redis
.\start.ps1 -NoBrowser
```

Verify the SFU answers: `Test-NetConnection 127.0.0.1 -Port 15580` should succeed.

---

## Sanity check

1. Dashboard loads at `http://localhost:10886` (dev) or `:15500` (Docker).
2. Create room → join → you see yourself. Invite a second browser window — two tiles.
3. Start the agent (`just agent`): it joins and says "Agent operational."
4. Say "summarize this meeting" — check the transcript panel.
5. Cloud LLM keys (optional): Settings → LLM Providers → paste a key
   (Meta/ OpenAI/Anthropic/DeepSeek/OpenRouter). Keys stay in a 0600 keystore
   on the backend; local Ollama needs no key.

---

## A second person (the actual conference)

One LiveKit server hosts the room. It stays on the PC that already runs `LiveKitSFU`. The other person does not install LiveKit, Ollama, or the agent. They run only the web app, and their browser sends audio and video to your server.

Your dashboard on `127.0.0.1:10886` is for you. Their browser must be told your reachable address. `ws://localhost:15580` on their PC is their own machine, so a call never forms.

Ports they must be able to reach (see [LIVEKIT.md](LIVEKIT.md)):

| Port | Protocol | What breaks if it is closed |
|------|----------|-----------------------------|
| 15580 | TCP | Room join fails |
| 15581 | TCP | WebRTC signaling fails |
| 15582 | UDP | Media fails |
| 50000-60000 | UDP | You join, then both tiles stay black |

After any `livekit.yaml` edit, restart the service. Do not kill the process:

```powershell
sc.exe stop LiveKitSFU
sc.exe start LiveKitSFU
```

### Usual path: both PCs on the same Tailscale tailnet

A normal dev PC has no stable public address. Tailscale gives both machines a stable `100.x` address without opening the UDP range on the router.

1. On the host, `tailscale ip -4`. That is the address the guest will use.
2. In `livekit.yaml`, under `rtc:`, set `node_ip` to that address and leave `use_external_ip: false`. Restart `LiveKitSFU`.
3. Allow inbound TCP 15580, TCP 15581, UDP 15582, and UDP 50000-60000. On a tailnet, limiting those rules to the Tailscale interface is enough.
4. On the guest PC, clone this repo and set `apps\web\.env.local`:

```text
NEXT_PUBLIC_LIVEKIT_URL=ws://<tailscale-ipv4>:15580
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=<the devkey secret in the host livekit.yaml>
AUTH_DISABLED=true
```

5. On the guest: `npm install`, then `.\start.ps1 -FrontendOnly`. Open `http://127.0.0.1:10886` and join the same room name you joined.

The agent runs only on the host. Leave and rejoin on the host if the agent was already in an old session, so the current worker enters.

### Unusual path: the host has a fixed public IP

Goliath has one. Most dev PCs do not. Use this only when Tailscale is not available.

1. On the router, forward TCP 15580, TCP 15581, UDP 15582, and UDP 50000-60000 to the host.
2. In `livekit.yaml`, set `rtc.use_external_ip: true`, or set `rtc.node_ip` to that public address. Restart `LiveKitSFU`.
3. The guest uses the same `.env.local` as above, with `NEXT_PUBLIC_LIVEKIT_URL=ws://<public-ipv4>:15580`. This repo does not terminate TLS, so the scheme stays `ws://`.
4. The dev API secret is in this repo. Anyone who can open port 15580 can mint a token with that secret. Prefer Tailscale. If you do publish the port, replace `keys.devkey` in `livekit.yaml` and the same value in every `LIVEKIT_API_SECRET` before the forward goes live.

### If the room connects and the video stays black

Signaling worked and UDP media did not. Check the firewall and the router, and check that `node_ip` is an address the other PC can route. The last failure mode here was LiveKit advertising a virtual adapter (`172.26.x`) that the guest could not reach.

Still broken? [TROUBLESHOOTING.md](TROUBLESHOOTING.md). LiveKit background: [LIVEKIT_OVERVIEW.md](LIVEKIT_OVERVIEW.md).
