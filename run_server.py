"""PyInstaller entry point — starts the conferencing MCP + health/metrics servers."""
import os
import sys

sys.argv = ["run_server.py"]

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "packages"))

import threading

from conferencing_mcp.health_server import run_health_server


def _start_health_server(port: int):
    server_thread = threading.Thread(target=run_health_server, args=(port,), daemon=True)
    server_thread.start()


if __name__ == "__main__":
    port = int(os.environ.get("MCP_PORT", os.environ.get("PORT", "10720")))
    host = os.environ.get("MCP_HOST", "127.0.0.1")

    health_port = port + 1
    _start_health_server(health_port)

    from conferencing_mcp.mcp_server import logger, mcp

    logger.info("Starting teleconference-mcp on %s:%d (health on :%d)", host, port, health_port)
    mcp.run(transport="http", host=host, port=port)
