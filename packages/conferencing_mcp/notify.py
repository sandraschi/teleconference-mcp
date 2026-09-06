"""packages/conferencing_mcp/notify.py - comms-mcp Telegram notifications.

Sends meeting-lifecycle events to the fleet comms-mcp gateway (comms-mcp).
Disabled (no-op) unless both COMMS_MCP_URL and COMMS_TELEGRAM_CHAT_ID are set.

Uses the comms-mcp REST surface POST /api/v1/send (allowlist-gated, outbox-logged),
so send is never a blocking failure for the caller.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger("ag-visio-mcp")

DEFAULT_COMMS_URL = "http://127.0.0.1:11028"


def _configured() -> bool:
    return bool(os.getenv("COMMS_MCP_URL") and os.getenv("COMMS_TELEGRAM_CHAT_ID"))


async def notify_meeting_event(
    event: str,
    title: str,
    room: str,
    **extra: Any,
) -> dict[str, Any]:
    """Fire a meeting lifecycle notification to Telegram via comms-mcp. Never raises.

    ``event`` is one of SCHEDULED | STARTED | ENDED | RECORDED | CANCELLED.

    ## Return Format
    {"sent": bool, "reason"/"status"/"error": ...} - sent=False means disabled or failed.

    ## Examples
    await notify_meeting_event("SCHEDULED", "Standup", "ag-visio-conference", organizer="me@x.com")
    """
    if not _configured():
        return {"sent": False, "reason": "not_configured"}

    url = os.getenv("COMMS_MCP_URL", DEFAULT_COMMS_URL).rstrip("/")
    chat_id = os.getenv("COMMS_TELEGRAM_CHAT_ID", "")

    text = f"[AG-Visio] {event}: {title} ({room})"
    if extra:
        detail = " | ".join(f"{k}={v}" for k, v in extra.items())
        text += f" - {detail}"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{url}/api/v1/send",
                json={"chat_id": chat_id, "text": text},
            )
            if resp.status_code == 200:
                return {"sent": True, "outbox": resp.json()}
            return {"sent": False, "status": resp.status_code, "error": resp.text[:300]}
    except Exception as exc:
        logger.warning("comms-mcp notify failed: %s", exc)
        return {"sent": False, "error": str(exc)}
