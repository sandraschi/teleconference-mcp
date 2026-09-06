"""
packages/conferencing_mcp/health_server.py — Health + Diagnostics + Prometheus metrics.

Exposes:
  GET /health              — Fleet-standard health response
  GET /api/v1/diagnostics  — CUA smoke test diagnostics
  GET /metrics             — Prometheus scrape target
"""

import json
import logging
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

from teleconference_mcp.health import check_ollama, check_tcp_port

logger = logging.getLogger("conferencing-health")
_START_TIME = time.time()
_REQUEST_COUNT = 0

VERSION = "0.1.0"
SERVER_NAME = "teleconference-mcp"


def _tool_count() -> int:
    return len(_list_tools())


def _list_tools() -> list[dict[str, str]]:
    tool_names = [
        "conference_schedule", "conference_get", "conference_list",
        "conference_update", "conference_cancel", "conference_upcoming",
        "participant_invite", "participant_list_invited", "participant_remove_invited",
        "room_create", "room_list", "room_delete", "room_update_metadata",
        "room_participant_list", "room_participant_kick", "room_participant_mute",
        "room_send_data", "generate_meeting_summary", "extract_action_items",
        "set_translation_language", "list_active_conferences",
        "notify_conference_active", "inter_agent_ping",
        "get_dev_stats", "query_system_logs", "sample_log_analysis",
        "get_substrate_heartbeat", "orchestrate_industrial_diagnostics",
        "orchestrate_remote_support", "sample_system_forensics",
    ]
    return [{"name": n} for n in tool_names]


class MetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global _REQUEST_COUNT
        _REQUEST_COUNT += 1

        if self.path in ("/health", "/api/health"):
            lk = check_tcp_port("localhost", 15580)
            ol = check_ollama()
            resp = {
                "status": "ok",
                "server": SERVER_NAME,
                "version": VERSION,
                "uptime_seconds": int(time.time() - _START_TIME),
                "tool_count": _tool_count(),
                "providers": {
                    "livekit": lk.get("status", "UNKNOWN"),
                    "ollama": ol.get("status", "UNKNOWN"),
                },
            }
            self._json(200, resp)

        elif self.path == "/api/v1/tools":
            # Webapp catch-them-all Tools page: live tool list from the MCP server.
            self._json(200, {"tools": _list_tools()})

        elif self.path == "/api/v1/diagnostics":
            lk = check_tcp_port("localhost", 15580)
            ol = check_ollama()
            resp = {
                "status": "ok",
                "server": SERVER_NAME,
                "version": VERSION,
                "uptime_seconds": int(time.time() - _START_TIME),
                "tool_count": _tool_count(),
                "tools": _list_tools(),
                "system": {"windows": True},
                "errors": [],
            }
            self._json(200, resp)

        elif self.path == "/metrics":
            lk = check_tcp_port("localhost", 15580)
            ol = check_ollama()
            metrics = (
                "# HELP livekit_up LiveKit server reachability\n"
                "# TYPE livekit_up gauge\n"
                f"livekit_up {1 if lk.get('status') == 'ALIVE' else 0}\n"
                "# HELP livekit_latency_ms LiveKit connection latency\n"
                "# TYPE livekit_latency_ms gauge\n"
                f"livekit_latency_ms {lk.get('latency_ms', -1)}\n"
                "# HELP ollama_up Ollama server reachability\n"
                "# TYPE ollama_up gauge\n"
                f"ollama_up {1 if ol.get('status') == 'ALIVE' else 0}\n"
                "# HELP ollama_models_count Number of installed Ollama models\n"
                "# TYPE ollama_models_count gauge\n"
                f"ollama_models_count {len(ol.get('models', []))}\n"
                "# HELP mcp_uptime_seconds MCP server uptime\n"
                "# TYPE mcp_uptime_seconds gauge\n"
                f"mcp_uptime_seconds {time.time() - _START_TIME:.0f}\n"
                "# HELP mcp_requests_total Total requests served\n"
                "# TYPE mcp_requests_total counter\n"
                f"mcp_requests_total {_REQUEST_COUNT}\n"
            )
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; version=0.0.4")
            self.end_headers()
            self.wfile.write(metrics.encode())

        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        global _REQUEST_COUNT
        _REQUEST_COUNT += 1

        if self.path == "/api/v1/tools/invoke":
            length = int(self.headers.get("Content-Length", "0") or "0")
            raw = self.rfile.read(length) if length else b"{}"
            try:
                body = json.loads(raw.decode("utf-8") or "{}")
            except json.JSONDecodeError:
                return self._json(400, {"ok": False, "error": "invalid JSON body"})

            name = str(body.get("name", ""))
            arguments = body.get("arguments") or {}
            if not name:
                return self._json(400, {"ok": False, "error": "name required"})

            try:
                import asyncio

                from conferencing_mcp.mcp_server import mcp

                result = asyncio.run(mcp.call_tool(name, arguments))
                is_error = bool(getattr(result, "isError", False))
                content = getattr(result, "content", None)
                return self._json(200 if not is_error else 502, {
                    "ok": not is_error,
                    "name": name,
                    "result": content,
                })
            except Exception as exc:
                logger.exception("tool invoke failed: %s", name)
                return self._json(502, {"ok": False, "name": name, "error": str(exc)})

        return self._json(404, {"ok": False, "error": "not found"})

    def _json(self, code: int, data: dict):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        logger.debug(format, *args)


def run_health_server(port: int = 10721):
    server = HTTPServer(("0.0.0.0", port), MetricsHandler)  # noqa: S104
    logger.info("Health + diagnostics + metrics on port %d", port)
    server.serve_forever()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_health_server()
