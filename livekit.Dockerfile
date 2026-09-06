# Custom LiveKit SOTA Image — Server v1.13.6 (2026-08-26)
# Changelog: TURN TTL enforced (v1.13.1 removes no-TTL compat), data tracks
# on by default (v1.11), H.264 baseline 42001f removed from defaults (v1.13.6).
FROM livekit/livekit-server:v1.13.6
COPY livekit.yaml /etc/livekit.yaml
CMD ["--config", "/etc/livekit.yaml"]
