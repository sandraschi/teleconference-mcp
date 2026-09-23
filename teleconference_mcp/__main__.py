"""
teleconference_mcp/__main__.py — AG-Visio launcher.
Usage: uv run -m teleconference_mcp [service]

Services:
  conferencing    Start the conferencing MCP server (default)
  agent           Start the Visio AI agent
  remoting        Start the remoting MCP server
  web             Start the Next.js dashboard
  all             Start all services
"""

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _run_python(module: str, cwd: str | None = None) -> int:
    return subprocess.call([sys.executable, "-m", module], cwd=cwd or str(ROOT))  # noqa: S603


def _run_npm(script: str, cwd: str) -> int:
    return subprocess.call(["npm", "run", script], cwd=cwd, shell=True)  # noqa: S602, S607


def run_conferencing():
    os.chdir(str(ROOT / "packages" / "conferencing_mcp"))
    from packages.conferencing_mcp.mcp_server import mcp

    mcp.run()


def run_remoting():
    os.chdir(str(ROOT / "packages" / "remoting_mcp"))
    from packages.remoting_mcp.mcp_server import mcp

    _port = int(os.environ.get("REMOTING_PORT", "11069"))  # fleet-registered, never 10725/8000
    _host = os.environ.get("REMOTING_HOST", "127.0.0.1")
    mcp.run(transport="sse", host=_host, port=_port)


def run_agent():
    os.chdir(str(ROOT / "apps" / "agent"))
    from apps.agent.agent import cli

    cli.run_app(__import__("apps.agent.agent", fromlist=["entrypoint"]).entrypoint)


def run_web():
    return _run_npm("dev", str(ROOT / "apps" / "web"))


SERVICES = {
    "conferencing": run_conferencing,
    "remoting": run_remoting,
    "agent": run_agent,
    "web": run_web,
}


def run_serve():
    """Fleet launcher entry: HTTP dual-surface backend (MCP /mcp + /health + /api/shutdown).

    Invoked by start.ps1 via the fleet engine as `python -m teleconference_mcp --serve`.
    Ports from env (MCP_PORT/PORT, HEALTH_PORT) defaulting to registered 10887/10891.
    """
    sys.path.insert(0, str(ROOT))
    from run_server import main as run_server_main

    port = int(os.environ.get("MCP_PORT", os.environ.get("PORT", "10887")))
    host = os.environ.get("MCP_HOST", "127.0.0.1")
    health_port = int(os.environ.get("HEALTH_PORT", "10891"))
    run_server_main(port=port, health_port=health_port, host=host)


def main():
    os.environ.setdefault("FASTMCP_LOG_LEVEL", "WARNING")
    args = sys.argv[1:]
    if not args or args[0] == "conferencing":
        run_conferencing()
    elif args[0] in ("serve", "--serve"):
        run_serve()
    elif args[0] == "all":
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            futures = [pool.submit(fn) for name, fn in SERVICES.items()]
            for f in concurrent.futures.as_completed(futures):
                f.result()
    elif args[0] in SERVICES:
        SERVICES[args[0]]()
    else:
        print(f"Unknown service: {args[0]}")
        print(f"Available: {', '.join(SERVICES)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
