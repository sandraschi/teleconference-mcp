import asyncio
import logging
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

from fastmcp import Context
from pydantic import Field

from .. import conference as conf
from ..mcp_server import _MUTATING, _READ_ONLY, cid, mcp
from ..notify import notify_meeting_event

logger = logging.getLogger("ag-visio-mcp")

# Keep references to fire-and-forget notify tasks so they are not GC'd (RUF006).
_notify_tasks: set[asyncio.Task] = set()


@mcp.tool(annotations=_MUTATING)
async def conference_schedule(
    ctx: Context,
    title: Annotated[str, Field(description="Conference title.")],
    scheduled_at: Annotated[str, Field(description="ISO-8601 UTC datetime, e.g. '2026-03-20T14:00:00Z'.")],
    organizer: Annotated[str, Field(description="Identity of the organizer.")],
    description: Annotated[str, Field(description="Optional conference description.")] = "",
    duration_min: Annotated[int, Field(description="Expected duration in minutes.", ge=1)] = 60,
    max_participants: Annotated[int, Field(description="Participant cap.", ge=1)] = 50,
) -> dict[str, Any]:
    """Schedule a new conference.

    ## Return Format
    {"id": str, "title": str, "scheduled_at": str, "organizer": str, "status": str, "room_name": str, ...}

    ## Examples
    await conference_schedule(title="Standup", scheduled_at="2026-05-23T09:00:00Z", organizer="me@example.com")
    await conference_schedule(
        title="Sprint Retro", scheduled_at="2026-05-23T16:00:00Z", organizer="scrum@example.com", duration_min=90
    )
    """
    _cid = cid(ctx)
    logger.info("Scheduling conference: %s", title, extra={"correlation_id": _cid})
    result = conf.schedule_conference(
        title=title,
        scheduled_at=scheduled_at,
        organizer=organizer,
        description=description,
        duration_min=duration_min,
        max_participants=max_participants,
    )
    if result.get("id"):
        room = result.get("room_name") or "ag-visio-conference"
        task = asyncio.create_task(
            notify_meeting_event(
                "SCHEDULED", title, room,
                organizer=organizer, when=scheduled_at,
            )
        )
        _notify_tasks.add(task)
        task.add_done_callback(_notify_tasks.discard)
    return result


@mcp.tool(annotations=_READ_ONLY)
async def conference_get(
    ctx: Context,
    conference_id: Annotated[str, Field(description="Conference UUID.")],
) -> dict[str, Any]:
    """Fetch a single scheduled conference by ID.

    ## Return Format
    {"id": str, "title": str, "scheduled_at": str, "status": str, ...} on success, {"error": str} if not found

    ## Examples
    await conference_get(conference_id="550e8400-e29b-41d4-a716-446655440000")
    """
    try:
        return conf.get_conference(conference_id)
    except KeyError as exc:
        return {"error": str(exc)}


@mcp.tool(annotations=_READ_ONLY)
async def conference_list(
    ctx: Context,
    status: Annotated[
        str, Field(description="Filter by status: SCHEDULED | ACTIVE | ENDED | CANCELLED (empty = all).")
    ] = "",
    after: Annotated[str, Field(description="ISO-8601 lower bound for scheduled_at (empty = no lower bound).")] = "",
    before: Annotated[str, Field(description="ISO-8601 upper bound for scheduled_at (empty = no upper bound).")] = "",
    limit: Annotated[int, Field(description="Max results.", ge=1)] = 50,
) -> list[dict[str, Any]]:
    """List conferences with optional filters.

    ## Return Format
    [{"id": str, "title": str, "scheduled_at": str, "status": str, "organizer": str, ...}]

    ## Examples
    await conference_list()
    await conference_list(status="SCHEDULED", limit=10)
    await conference_list(status="ACTIVE", after="2026-05-01T00:00:00Z")
    """
    return conf.list_conferences(
        status=status or None,
        after=after or None,
        before=before or None,
        limit=limit,
    )


@mcp.tool(annotations=_MUTATING)
async def conference_update(
    ctx: Context,
    conference_id: Annotated[str, Field(description="Conference UUID.")],
    title: Annotated[str, Field(description="New title (empty = no change).")] = "",
    description: Annotated[str, Field(description="New description (empty = no change).")] = "",
    scheduled_at: Annotated[str, Field(description="New scheduled_at ISO-8601 (empty = no change).")] = "",
    duration_min: Annotated[int, Field(description="New duration (0 = no change).")] = 0,
    max_participants: Annotated[int, Field(description="New participant cap (0 = no change).")] = 0,
    status: Annotated[str, Field(description="New status (empty = no change).")] = "",
) -> dict[str, Any]:
    """Update mutable fields on a scheduled conference. Only non-empty / non-zero args are applied.

    ## Return Format
    {"id": str, ...} with updated fields on success, {"error": str} on failure

    ## Examples
    await conference_update(conference_id="550e8400...", title="Updated Standup")
    await conference_update(conference_id="550e8400...", status="CANCELLED")
    """
    fields: dict[str, Any] = {}
    if title:
        fields["title"] = title
    if description:
        fields["description"] = description
    if scheduled_at:
        fields["scheduled_at"] = scheduled_at
    if duration_min > 0:
        fields["duration_min"] = duration_min
    if max_participants > 0:
        fields["max_participants"] = max_participants
    if status:
        fields["status"] = status
    if not fields:
        return {"error": "No fields provided to update."}
    try:
        return conf.update_conference(conference_id, **fields)
    except KeyError as exc:
        return {"error": str(exc)}


@mcp.tool(annotations=_MUTATING)
async def conference_cancel(
    ctx: Context,
    conference_id: Annotated[str, Field(description="Conference UUID to cancel.")],
) -> dict[str, Any]:
    """Cancel a scheduled or active conference.

    ## Return Format
    {"id": str, "status": "CANCELLED", ...} on success, {"error": str} if not found

    ## Examples
    await conference_cancel(conference_id="550e8400-e29b-41d4-a716-446655440000")
    """
    try:
        return conf.cancel_conference(conference_id)
    except KeyError as exc:
        return {"error": str(exc)}


@mcp.tool(annotations=_READ_ONLY)
async def conference_upcoming(
    ctx: Context,
    days: Annotated[int, Field(description="Lookahead window in days.", ge=1)] = 7,
) -> list[dict[str, Any]]:
    """List SCHEDULED conferences in the next N days (default 7).

    ## Return Format
    [{"id": str, "title": str, "scheduled_at": str, "organizer": str, ...}]

    ## Examples
    await conference_upcoming()
    await conference_upcoming(days=14)
    """
    now = conf.now_iso()
    horizon = (datetime.now(UTC) + timedelta(days=days)).isoformat().replace("+00:00", "Z")
    return conf.list_conferences(status="SCHEDULED", after=now, before=horizon)


@mcp.tool(annotations=_MUTATING)
async def participant_invite(
    ctx: Context,
    conference_id: Annotated[str, Field(description="Conference UUID.")],
    identity: Annotated[str, Field(description="Unique identity string (e.g. email or username).")],
    display_name: Annotated[str, Field(description="Human-readable name.")] = "",
    role: Annotated[str, Field(description="HOST | PARTICIPANT | OBSERVER.")] = "PARTICIPANT",
) -> list[dict[str, Any]]:
    """Invite a participant to a scheduled conference.

    ## Return Format
    [{"id": str, "conference_id": str, "identity": str, "role": str, ...}] on success, [{"error": str}] if not found

    ## Examples
    await participant_invite(conference_id="550e8400...", identity="alice@example.com")
    await participant_invite(conference_id="550e8400...", identity="bob@example.com", role="HOST", display_name="Bob")
    """
    try:
        return conf.invite_participant(conference_id, identity, display_name, role)
    except KeyError as exc:
        return [{"error": str(exc)}]


@mcp.tool(annotations=_READ_ONLY)
async def participant_list_invited(
    ctx: Context,
    conference_id: Annotated[str, Field(description="Conference UUID.")],
) -> list[dict[str, Any]]:
    """List all invited participants for a scheduled conference.

    ## Return Format
    [{"id": str, "conference_id": str, "identity": str, "display_name": str, "role": str, ...}]

    ## Examples
    await participant_list_invited(conference_id="550e8400-e29b-41d4-a716-446655440000")
    """
    return conf.list_invited_participants(conference_id)


@mcp.tool(annotations=_MUTATING)
async def participant_remove_invited(
    ctx: Context,
    conference_id: Annotated[str, Field(description="Conference UUID.")],
    identity: Annotated[str, Field(description="Participant identity to remove.")],
) -> dict[str, str]:
    """Remove a participant invitation from a scheduled conference.

    ## Return Format
    {"identity": str, "conference_id": str} on success

    ## Examples
    await participant_remove_invited(conference_id="550e8400...", identity="alice@example.com")
    """
    return conf.remove_invited_participant(conference_id, identity)
