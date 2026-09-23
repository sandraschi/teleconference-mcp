"""PyInstaller entry point - starts the conferencing MCP + health/metrics servers.

Dual surface on BackendPort (default 10887):
  GET /health          - fleet readiness probe ({"status": "ok"})
  POST /api/shutdown   - orderly exit for NSSM/launcher restarts (200 now, exit 500ms later)
  /mcp                 - FastMCP streamable-HTTP (mounted per BUG-008/BUG-038 pattern:
                         http_app(path="/") + parent lifespan enters the sub-app router
                         lifespan, else every real client gets Session terminated)
Health/metrics/diagnostics stay on the dedicated :10891 stdlib health_server.
"""

import asyncio
import os
import sys
import threading
from contextlib import asynccontextmanager

sys.argv = ["run_server.py"]

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "packages"))

import uvicorn  # noqa: E402
from conferencing_mcp.health_server import run_health_server  # noqa: E402
from starlette.applications import Starlette  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402
from starlette.responses import JSONResponse  # noqa: E402
from starlette.routing import Mount, Route  # noqa: E402


def _start_health_server(port: int):
    server_thread = threading.Thread(target=run_health_server, args=(port,), daemon=True)
    server_thread.start()


async def _shutdown_later():
    import asyncio

    await asyncio.sleep(0.5)
    os._exit(0)


async def shutdown_endpoint(request):
    asyncio.get_running_loop().create_task(_shutdown_later())
    return JSONResponse({"status": "shutting down"})


async def health_endpoint(request):
    return JSONResponse({"status": "ok"})


def build_app():
    from conferencing_mcp.mcp_server import mcp

    try:
        mcp_app = mcp.http_app(path="/")  # NOT http_app() - default path double-prefixes (BUG-008)
    except (AttributeError, RuntimeError):
        mcp_app = mcp.http_app()

    @asynccontextmanager
    async def lifespan(app):
        # Fold the mounted sub-app lifespan into the parent (BUG-038)
        try:
            async with mcp_app.router.lifespan_context(app):
                yield
        except AttributeError:
            yield

    app = Starlette(
        lifespan=lifespan,
        routes=[
            Route("/health", health_endpoint, methods=["GET"]),
            Route("/api/shutdown", shutdown_endpoint, methods=["POST"]),
            Mount("/mcp", app=mcp_app),
        ],
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://127.0.0.1:10886",
            "http://localhost:10886",
        ],
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|100\.\d+\.\d+\.\d+)(:\d+)?",
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )
    return app


def main(port: int = 10887, health_port: int = 10891, host: str = "127.0.0.1"):
    from conferencing_mcp.mcp_server import logger

    _start_health_server(health_port)
    app = build_app()
    logger.info("Starting teleconference-mcp on %s:%d (health on :%d)", host, port, health_port)
    uvicorn.run(app, host=host, port=port, log_level="warning")


if __name__ == "__main__":
    # Fleet-registered backend port (WEBAPP_PORTS.md: 10887). NOT 10720/10721 -
    # those belong to calibre-mcp and would collide.
    port = int(os.environ.get("MCP_PORT", os.environ.get("PORT", "10887")))
    host = os.environ.get("MCP_HOST", "127.0.0.1")

    # Health/metrics on a dedicated registered port (10891), NOT port+1 (10888 is myai's).
    health_port = int(os.environ.get("HEALTH_PORT", "10891"))
    main(port=port, health_port=health_port, host=host)
