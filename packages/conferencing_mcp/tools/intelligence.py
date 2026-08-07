import logging
import time
from typing import Annotated, Any

from fastmcp import Context
from pydantic import Field

from ..mcp_server import _MUTATING, _get_db, _get_embedding_model, cid, mcp

logger = logging.getLogger("ag-visio-mcp")


@mcp.tool(annotations=_MUTATING)
async def generate_meeting_summary(
    ctx: Context,
    room_name: Annotated[str, Field(description="Name of the active LiveKit room.")],
    transcript: Annotated[str, Field(description="Full text of the conversation to summarize.")],
) -> dict[str, Any]:
    """Summarize the meeting transcript and persist to the memory substrate.

    ## Return Format
    {"success": bool, "summary": str, "room_name": str, "persisted": bool, "correlation_id": str}

    ## Examples
    await generate_meeting_summary(room_name="standup", transcript="Alice: Good morning team...")
    """
    _cid = cid(ctx)

    prompt = f"Summarize the following meeting transcript for room '{room_name}':\n\n{transcript}"

    try:
        summary_obj = await ctx.sample(prompt, max_tokens=1000)
        summary_text = summary_obj.content.text

        vector = list(next(_get_embedding_model().embed([summary_text])))
        table = _get_db().open_table("meeting_insights")
        table.add(
            [
                {
                    "vector": vector,
                    "type": "summary",
                    "content": summary_text,
                    "room_name": room_name,
                    "timestamp": time.time(),
                }
            ]
        )

        return {
            "success": True,
            "summary": summary_text,
            "room_name": room_name,
            "persisted": True,
            "correlation_id": _cid,
        }
    except Exception as e:
        logger.error(f"Summary generation failed: {e}", extra={"correlation_id": _cid})
        return {"success": False, "error": str(e)}


@mcp.tool(annotations=_MUTATING)
async def extract_action_items(
    ctx: Context,
    room_name: Annotated[str, Field(description="Name of the active LiveKit room.")],
    transcript: Annotated[str, Field(description="Full text of the conversation to analyze.")],
) -> dict[str, Any]:
    """Extract action items and tasks from the meeting transcript.

    ## Return Format
    {"success": bool, "action_items": str, "room_name": str, "persisted": bool, "correlation_id": str}

    ## Examples
    await extract_action_items(room_name="sprint-planning", transcript="Bob: I'll take the login page...")
    """
    _cid = cid(ctx)

    prompt = (
        f"Extract a bulleted list of action items and assigned tasks from this meeting transcript "
        f"for room '{room_name}':\n\n{transcript}"
    )

    try:
        items_obj = await ctx.sample(prompt, max_tokens=1000)
        items_text = items_obj.content.text

        vector = list(next(_get_embedding_model().embed([items_text])))
        table = _get_db().open_table("meeting_insights")
        table.add(
            [
                {
                    "vector": vector,
                    "type": "action_items",
                    "content": items_text,
                    "room_name": room_name,
                    "timestamp": time.time(),
                }
            ]
        )

        return {
            "success": True,
            "action_items": items_text,
            "room_name": room_name,
            "persisted": True,
            "correlation_id": _cid,
        }
    except Exception as e:
        logger.error(f"Action item extraction failed: {e}", extra={"correlation_id": _cid})
        return {"success": False, "error": str(e)}


@mcp.tool(annotations=_MUTATING)
async def set_translation_language(
    ctx: Context,
    language: Annotated[str, Field(description="Target language, e.g. 'Japanese', 'German', 'Spanish'.")],
) -> str:
    """Set the target language for live translation in the current session.

    ## Return Format
    str — confirmation message with the target language

    ## Examples
    await set_translation_language(language="Japanese")
    await set_translation_language(language="German")
    """
    _cid = cid(ctx)
    logger.info(f"Setting translation language to: {language}", extra={"correlation_id": _cid})
    return f"TRANSLATION_MODE_ACTIVE: Target set to '{language}'. All subsequent transcripts will be processed."
