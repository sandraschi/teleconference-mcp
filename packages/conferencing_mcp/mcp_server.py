import logging
import os
import sys

from fastmcp import FastMCP
from fastmcp.server import create_proxy


class CorrelationIdFilter(logging.Filter):
    """Injects a default correlation_id so %(correlation_id)s never raises KeyError."""

    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "correlation_id"):
            record.correlation_id = "GLOBAL"
        return True


_handler_stdout = logging.StreamHandler(sys.stdout)
_handler_file = logging.FileHandler("mcp_server.log")
for _h in (_handler_stdout, _handler_file):
    _h.addFilter(CorrelationIdFilter())

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - [%(correlation_id)s] - %(message)s",
    handlers=[_handler_stdout, _handler_file],
)
logger = logging.getLogger("ag-visio-mcp")
logger.addFilter(CorrelationIdFilter())


def cid(ctx) -> str:
    """Extract correlation_id from Context, defaulting to 'GLOBAL'."""
    return getattr(ctx, "correlation_id", "GLOBAL")


mcp = FastMCP("teleconference-mcp", version="3.1.2")

_READ_ONLY = {"readonly": True}
_MUTATING = {}

# MCP Bridge: ProxyProvider for multi-server federation
_bridge_urls = os.getenv("MCP_BRIDGE_URLS", "")
if _bridge_urls:
    for _url in _bridge_urls.split(","):
        _url = _url.strip()
        if _url:
            try:
                mcp.add_provider(create_proxy(_url))
                logger.info("MCP bridge registered: %s", _url)
            except Exception as e:
                logger.warning("MCP bridge failed for %s: %s", _url, e)

# Persistence Substrate — lazy-initialized to avoid I/O on import
_db = None
_embedding_model = None

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "apps", "agent", "lancedb_data")


def _get_db():
    global _db
    if _db is None:
        import lancedb

        _db = lancedb.connect(DB_PATH)
    return _db


def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        from fastembed import TextEmbedding

        _embedding_model = TextEmbedding()
    return _embedding_model


def _init_insight_tables():
    if "meeting_insights" not in _get_db().list_tables():
        _get_db().create_table(
            "meeting_insights",
            data=[
                {
                    "vector": [0.0] * 384,
                    "type": "init",
                    "content": "init",
                    "room_name": "init",
                    "timestamp": 0.0,
                }
            ],
            mode="overwrite",
        )


_init_insight_tables()

# Tool registration — imports trigger @mcp.tool() decorators
from .tools import *  # noqa: E402, F403

if __name__ == "__main__":
    logger.info(
        "Initializing AG-Visio SOTA MCP Server via FastMCP",
        extra={"correlation_id": "INIT"},
    )
    mcp.run()
