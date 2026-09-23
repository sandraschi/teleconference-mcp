import logging
from typing import Annotated, Any

from fastmcp import Context
from pydantic import Field

from .. import conference as conf
from ..mcp_server import _MUTATING, _READ_ONLY, cid, mcp

logger = logging.getLogger("ag-visio-mcp")


@mcp.tool(annotations=_MUTATING)
async def room_create(
    ctx: Context,
    name: Annotated[str, Field(description="Room name (unique identifier).")],
    max_participants: Annotated[int, Field(description="Hard participant cap.", ge=1)] = 50,
    empty_timeout: Annotated[int, Field(description="Seconds until empty room auto-closes.", ge=0)] = 300,
    metadata: Annotated[str, Field(description="Arbitrary string metadata.")] = "",
) -> dict[str, Any]:
    """Create a LiveKit room.

    ## Return Format
    {"id": str, "name": str, "max_participants": int, "empty_timeout": int, ...} on success, {"error": str} on failure

    ## Examples
    await room_create(name="standup", max_participants=20)
    await room_create(name="war-room", empty_timeout=600, metadata='{"topic":"incident"}')
    """
    _cid = cid(ctx)
    try:
        return await conf.lk_create_room(name, max_participants, empty_timeout, metadata)
    except Exception as exc:
        logger.exception("room_create failed: %s", exc, extra={"correlation_id": _cid})
        return {"error": str(exc)}


@mcp.tool(annotations=_READ_ONLY)
async def room_list(
    ctx: Context,
    filter_names: Annotated[str, Field(description="Comma-separated room names to filter by (empty = all).")] = "",
) -> list[dict[str, Any]]:
    """List all active LiveKit rooms.

    ## Return Format
    [{"id": str, "name": str, "num_participants": int, ...}] on success, [{"error": str}] on failure

    ## Examples
    await room_list()
    await room_list(filter_names="standup,war-room")
    """
    names = [n.strip() for n in filter_names.split(",") if n.strip()] if filter_names else None
    try:
        return await conf.lk_list_rooms(names)
    except Exception as exc:
        return [{"error": str(exc)}]


@mcp.tool(annotations=_MUTATING)
async def room_delete(
    ctx: Context,
    name: Annotated[str, Field(description="Room name to delete. Kicks all participants.")],
) -> dict[str, str]:
    """Delete a LiveKit room by name. Kicks all participants.

    ## Return Format
    {"status": str} on success, {"error": str} on failure

    ## Examples
    await room_delete(name="old-room")
    """
    _cid = cid(ctx)
    try:
        return await conf.lk_delete_room(name)
    except Exception as exc:
        logger.exception("room_delete failed: %s", exc, extra={"correlation_id": _cid})
        return {"error": str(exc)}


@mcp.tool(annotations=_MUTATING)
async def room_update_metadata(
    ctx: Context,
    name: Annotated[str, Field(description="Room name to update.")],
    metadata: Annotated[str, Field(description="New metadata string (replaces existing).")],
) -> dict[str, Any]:
    """Update the metadata string on a LiveKit room.

    ## Return Format
    {"name": str, "metadata": str, ...} on success, {"error": str} on failure

    ## Examples
    await room_update_metadata(name="standup", metadata='{"agenda":"sprint review"}')
    """
    _cid = cid(ctx)
    try:
        return await conf.lk_update_room_metadata(name, metadata)
    except Exception as exc:
        logger.exception("room_update_metadata failed: %s", exc, extra={"correlation_id": _cid})
        return {"error": str(exc)}


@mcp.tool(annotations=_READ_ONLY)
async def room_participant_list(
    ctx: Context,
    room_name: Annotated[str, Field(description="LiveKit room name to inspect.")],
) -> list[dict[str, Any]]:
    """List all live participants currently in a LiveKit room.

    ## Return Format
    [{"identity": str, "sid": str, "tracks": [...], ...}] on success, [{"error": str}] on failure

    ## Examples
    await room_participant_list(room_name="standup")
    """
    try:
        return await conf.lk_list_participants(room_name)
    except Exception as exc:
        return [{"error": str(exc)}]


@mcp.tool(annotations=_MUTATING)
async def room_participant_kick(
    ctx: Context,
    room_name: Annotated[str, Field(description="Target room.")],
    identity: Annotated[str, Field(description="Participant identity to remove.")],
) -> dict[str, str]:
    """Kick (remove) a participant from a live LiveKit room.

    ## Return Format
    {"status": str} on success, {"error": str} on failure

    ## Examples
    await room_participant_kick(room_name="standup", identity="user-123")
    """
    try:
        return await conf.lk_kick_participant(room_name, identity)
    except Exception as exc:
        return {"error": str(exc)}


@mcp.tool(annotations=_MUTATING)
async def room_participant_mute(
    ctx: Context,
    room_name: Annotated[str, Field(description="Target room.")],
    identity: Annotated[str, Field(description="Participant identity.")],
    track_sid: Annotated[str, Field(description="Track SID (get from room_participant_list).")],
    muted: Annotated[bool, Field(description="True to mute, False to unmute.")] = True,
) -> dict[str, Any]:
    """Mute or unmute a participant's track in a live LiveKit room.

    ## Return Format
    {"status": str, "track_sid": str, "muted": bool} on success, {"error": str} on failure

    ## Examples
    await room_participant_mute(room_name="standup", identity="user-123", track_sid="TR_abc")
    await room_participant_mute(room_name="standup", identity="user-123", track_sid="TR_abc", muted=False)
    """
    try:
        return await conf.lk_mute_participant(room_name, identity, track_sid, muted)
    except Exception as exc:
        return {"error": str(exc)}


@mcp.tool(annotations=_MUTATING)
async def room_send_data(
    ctx: Context,
    room_name: Annotated[str, Field(description="Target room.")],
    data: Annotated[str, Field(description="UTF-8 string payload (JSON recommended).")],
    destination_identities: Annotated[str, Field(description="Comma-separated identities (empty = broadcast).")] = "",
) -> dict[str, str]:
    """Send a data message to a LiveKit room or specific participants.

    ## Return Format
    {"status": str} on success, {"error": str} on failure

    ## Examples
    await room_send_data(room_name="standup", data='{"type":"ping"}')
    await room_send_data(room_name="standup", data='{"type":"dm"}', destination_identities="user-456")
    """
    identities = [i.strip() for i in destination_identities.split(",") if i.strip()] if destination_identities else None
    try:
        return await conf.lk_send_data(room_name, data, identities)
    except Exception as exc:
        return {"error": str(exc)}
