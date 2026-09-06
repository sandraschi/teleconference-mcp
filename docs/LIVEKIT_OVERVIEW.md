# LiveKit Overview — What It Is and Why We Use It

**Read this first.** Technical config lives in [LIVEKIT.md](LIVEKIT.md); this page answers
*"what is LiveKit?"* — what it is, where it came from, who else uses it, and where to learn more.

---

## What is LiveKit?

**LiveKit** ([livekit.io](https://livekit.io)) is an open-source **WebRTC SFU (Selective Forwarding Unit)**
for real-time audio, video, and data. Each participant sends one media stream to the server; the server
forwards (not mixes) it to the others — low latency, low bandwidth, works in the browser with no plugins.

Around the SFU, LiveKit ships a full platform:

| Piece | What it does | We use |
|-------|--------------|--------|
| **Server** (`livekit-server`, Go, Apache-2.0) | Rooms, tracks, JWT auth, SIP, egress/recording, autoscaling | ✅ v1.13.6 (`LiveKitSFU` service) |
| **Client SDKs** (JS/Swift/Android/Flutter) | Publish/subscribe tracks, data channels | ✅ `livekit-client` 2.22.2 |
| **UI components** (`@livekit/components-react`) | `<LiveKitRoom>`, grids, control bars, hooks | ✅ 2.9.24 |
| **Server SDKs** (Node/Python/Go/Ruby) | Tokens, room management, egress control | ✅ `livekit-server-sdk` 2.18.0 |
| **Agents framework** (Python/Node) | Voice/multimodal workers that join rooms as participants (VAD → STT → LLM → TTS) | ✅ agents 1.8.0 (Visio) |
| **LiveKit Cloud** | Hosted SFU + agent orchestration (optional) | ❌ we self-host |

This repo **wraps LiveKit as its media host**: LiveKit is never bundled — install the native
`livekit-server` (or use our Docker image) separately. See [ONBOARDING.md](ONBOARDING.md).

---

## History in 60 seconds

* **2021** — Founded in San Francisco by **Russ d'Sa (CEO)** and **David Zhao (CTO)** as an
  open-source SFU: self-hostable real-time media, an alternative to Twilio/Agora.
* **2022–2023** — Demand for hosting from Spotify, Oracle, Reddit produces **LiveKit Cloud**.
* **2023** — After ChatGPT launches, a LiveKit-powered voice demo wins a deal to run
  **ChatGPT voice modes on LiveKit Cloud**. The project pivots from conferencing plumbing to
  *the* infrastructure layer for voice AI: SDKs, SIP/telephony, egress, Agents framework.
* **2024–2026** — $22M Series A (Altimeter), $45M Series B ($345M valuation), **$100M Series C
  (Index Ventures, Jan 2026, $1B valuation)**. 300,000+ developers; `livekit/livekit` ~20.7k stars,
  `livekit/agents` ~14k stars (Sep 2026).

---

## Who else uses it

| User | Use |
|------|-----|
| **OpenAI ChatGPT voice modes** | Realtime voice on LiveKit Cloud |
| **Apple FaceTime (iOS 18)** | LiveKit embedded for emergency calls |
| **France's Visio** | Government video-conferencing on the OSS SFU |
| **Spotify / Oracle / Reddit** | Livestreaming, interactive audio |
| **Salesforce, Meta, Microsoft** | Voice/video AI features |
| **US 911 emergency services** | Real-time emergency-call media |
| **LiveKit Meet** ([`livekit-examples/meet`](https://github.com/livekit-examples/meet)) | OSS reference conferencing app our web UI descends from |
| **This fleet** | `teleconference-mcp` (conferencing + Visio agent) and `teleoperator-mcp` (robot video return) |

---

## How we use it here

```
Browser (Next.js) ──token──▶ /api/token (roomCreate: auto-create rooms)
       │ WebRTC tracks
       ▼
LiveKitSFU :15580 ──forwards──▶ other participants + Visio agent worker
       │ Egress v2
       ▼
/api/egress/start|stop → MP4 recordings → /recordings page
```

* **Rooms** auto-create on first join (`roomCreate` grant, server v1.12+). Manage via MCP tools
  (`room_create`, `room_list`, …) or `RoomServiceClient`.
* **Visio agent** (`apps/agent/`) joins as a participant: Silero VAD → Whisper STT → Ollama LLM →
  Piper TTS, local-first.
* **Data**: chat/transcripts over data channels (data tracks on by default, server v1.11+).
* Details: [LIVEKIT.md](LIVEKIT.md) (server config), [TOOLS.md](TOOLS.md) (room/conference tools),
  [ARCHITECTURE.md](ARCHITECTURE.md) (ports, data flow).

---

## Community & official links

| Channel | Link |
|---------|------|
| Homepage | <https://livekit.io> |
| Docs (with `llms.txt`) | <https://docs.livekit.io> |
| GitHub org | <https://github.com/livekit> |
| Forum | <https://community.livekit.io> |
| Slack | <https://livekit.com/join-slack> |
| Blog | <https://livekit.io/blog> |
| YouTube | <https://www.youtube.com/@livekit_io> |
| Coding-agent support (MCP) | <https://docs.livekit.io/mcp> |

---

## Bibliography

* Docs — <https://docs.livekit.io>, `llms.txt` at <https://docs.livekit.io/llms.txt>
* `livekit/livekit` releases — <https://github.com/livekit/livekit/releases>
* `livekit/agents` releases — <https://github.com/livekit/agents/releases>
* Wikipedia, "LiveKit" — <https://en.wikipedia.org/wiki/LiveKit> (history, funding, customers)
* Bass (2026-01-22), Bloomberg — <https://www.bloomberg.com/news/articles/2026-01-22/livekit-seller-of-voice-tools-to-openai-raises-100-million>
* Wiggers (2025-04-10), TechCrunch — <https://techcrunch.com/2025/04/10/livekits-tools-help-power-real-time-communications/>
* Bovenziner (2026-02-11), The Stack (France Visio) — <https://www.thestack.technology/inside-the-open-source-project-powering-frances-video-platform-revolution/>
* Fleet hub: `mcp-central-docs/integrations/livekit/` (README, integration guide, upgrade notes, MCP patterns)
