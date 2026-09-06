# Troubleshooting

Problem → Cause → Fix, flat list.

---

## Dashboard doesn't load
**Cause**: Web service not running.
**Fix**: `.\start.ps1 all`; check `http://localhost:10886` (dev) or `:15500` (Docker).

## "Failed to connect" to LiveKit
**Cause**: SFU down or wrong URL.
**Fix**: `Get-Service LiveKitSFU` (fleet) or `docker compose ps`; verify `NEXT_PUBLIC_LIVEKIT_URL`
matches the server (`ws://localhost:15580`); `Test-NetConnection 127.0.0.1 -Port 15580`.

## "Invalid token" / 401 from /api/discovery, /api/token, /api/egress
**Cause**: API key/secret mismatch between web env and `livekit.yaml` keys.
**Fix**: All web server routes read `lib/livekit-server.ts` (env first, dev default = yaml value).
Align `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` on both sides, restart web. Compose defaults
already match the yaml.

## Auth.js MissingSecret / /api/auth/session 500 in dev
**Cause**: Auth.js requires a secret on every request when `AUTH_SECRET` is unset.
**Fix**: `auth.ts` falls back to a dev-only insecure secret outside production
(production without `AUTH_SECRET` still throws). Set `AUTH_DISABLED=true` to bypass
auth entirely in dev.

## Agent joins but never speaks
**Cause**: Ollama unreachable or wrong model.
**Fix**: `ollama serve`, `ollama list` (need the `OLLAMA_MODEL`, default `gemma2`); check
`OLLAMA_HOST` — Docker agent needs `http://host.docker.internal:11434`. Agent logs show the LLM error.

## Agent never appears in room
**Cause**: Worker not running or wrong `LIVEKIT_URL`.
**Fix**: `just agent` (runs `agent.py dev`); confirm `LIVEKIT_URL` points at the SFU.

## No audio/video, black tiles
**Cause**: Browser permissions or wrong device.
**Fix**: Allow camera/mic in the browser; open `/test` page, pick devices, they persist to localStorage.

## Echo or choppy audio
**Cause**: Multiple outputs / network.
**Fix**: Headphones; single speaker path; lower video resolution; check bandwidth.

## `uv run` fails with missing modules
**Cause**: Deps not installed.
**Fix**: `uv sync` at repo root first.

## Port conflicts
**Cause**: Zombie process on 10886/15580/10720.
**Fix**: `netstat -ano | findstr :10886`, kill the PID; `start.ps1` clears ports before binding.

## Recording start returns 502
**Cause**: No file/S3 egress output configured on the SFU.
**Fix**: Expected without egress storage — configure output in the LiveKit server, then retry.
`GET /api/egress?type=recordings` lists real egresses.

## FastEmbed ONNX errors in tests
**Cause**: Corrupt local `fastembed_cache` (missing `model_optimized.onnx`).
**Fix**: Clear `%TEMP%\fastembed_cache` and re-run `uv run pytest tests/ -q`. Pre-existing, unrelated to LiveKit.

## LiveKit service flap-loops after upgrade
**Cause**: Server v1.13.x validates TURN values strictly and fails on partial prom config.
**Fix**: Check `logs\livekit.err.log`; fix `livekit.yaml` TURN/prometheus sections. The Windows
CPU-monitor notice in `.err.log` is benign.
