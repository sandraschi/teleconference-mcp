"""LLM contract routes (fleet canonical: mcp-central-docs/templates/llm/INTEGRATION.md).

Mounted on the Starlette parent in run_server.build_app (plain Router, function
handlers, no decorators — STARLETTE_NO_PYDANTIC_STANDARD). All JSON. Keys travel
in POST bodies only and are never echoed back.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

from conferencing_mcp import llm_providers as llm
from starlette.requests import Request
from starlette.responses import JSONResponse, StreamingResponse
from starlette.routing import Route


def _err(status: int, detail: str) -> JSONResponse:
    return JSONResponse({"detail": detail}, status_code=status)


async def _body(request: Request) -> dict[str, Any]:
    try:
        data = await request.json()
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


async def providers_endpoint(request: Request) -> JSONResponse:
    rows = llm.public_provider_info()
    locals_ = [r for r in rows if r["kind"] == "local"]

    async def _detect(row: dict[str, Any]) -> tuple[str, bool, list[str]]:
        try:
            ok, models = await llm.probe_local(row["id"])
        except Exception:
            return row["id"], False, []
        return row["id"], ok, models

    detected = await asyncio.gather(*(_detect(r) for r in locals_))
    by_id = {pid: (ok, models) for pid, ok, models in detected}
    for r in rows:
        if r["id"] in by_id:
            ok, models = by_id[r["id"]]
            r["detected"] = ok
            r["models"] = models
    return JSONResponse({"providers": rows})


async def models_endpoint(request: Request) -> JSONResponse:
    provider = request.query_params.get("provider", "")
    try:
        return JSONResponse(await llm.list_models(provider))
    except ValueError as exc:
        return _err(404 if "Unknown provider" in str(exc) else 400, str(exc))


async def test_endpoint(request: Request) -> JSONResponse:
    body = await _body(request)
    provider = str(body.get("provider", ""))
    try:
        result = await llm.test_provider(
            provider,
            api_key=str(body.get("api_key", "")),
            endpoint=str(body.get("endpoint", "")),
        )
    except ValueError as exc:
        return _err(404 if "Unknown provider" in str(exc) else 400, str(exc))
    return JSONResponse(result)


async def settings_get_endpoint(request: Request) -> JSONResponse:
    settings = llm.load_llm_settings()
    settings["keys_configured"] = llm.keys_configured()
    return JSONResponse(settings)


async def settings_post_endpoint(request: Request) -> JSONResponse:
    body = await _body(request)
    provider = str(body.get("provider", ""))
    model = str(body.get("model", ""))
    api_key = str(body.get("api_key", ""))
    select = body.get("select", True)
    try:
        if api_key:
            llm.require_provider(provider)
            llm.save_key(provider, api_key)
        # BUG-043: select:false attaches the key only; the active pair is untouched.
        if select is False:
            current = llm.load_llm_settings()
            current["keys_configured"] = llm.keys_configured()
            current["saved_key_for"] = provider
            return JSONResponse(current)
        saved = llm.save_llm_settings(provider, model)
    except ValueError as exc:
        return _err(404 if "Unknown provider" in str(exc) else 400, str(exc))
    saved["keys_configured"] = llm.keys_configured()
    return JSONResponse(saved)


async def key_delete_endpoint(request: Request) -> JSONResponse:
    provider = request.query_params.get("provider", "")
    try:
        deleted = llm.delete_key(provider)
    except ValueError as exc:
        return _err(404 if "Unknown provider" in str(exc) else 400, str(exc))
    return JSONResponse({"provider": provider, "deleted": deleted})


def _active_pair(body: dict[str, Any]) -> tuple[str, str]:
    settings = llm.load_llm_settings()
    provider = str(body.get("provider") or settings.get("provider") or "ollama")
    model = str(body.get("model") or settings.get("model") or "")
    return provider, model


async def chat_endpoint(request: Request) -> JSONResponse:
    body = await _body(request)
    messages = body.get("messages")
    if not isinstance(messages, list) or not messages:
        return _err(400, "messages (non-empty array) is required")
    provider, model = _active_pair(body)
    try:
        text = await llm.chat_complete(provider, model, messages)
    except ValueError as exc:
        return _err(400, str(exc))
    except RuntimeError as exc:
        return _err(502, str(exc))
    return JSONResponse({"content": text})


async def chat_stream_endpoint(request: Request) -> StreamingResponse:
    body = await _body(request)
    messages = body.get("messages")
    if not isinstance(messages, list) or not messages:

        async def _errgen():
            yield b'data: {"error": "messages (non-empty array) is required"}\n\n'

        return StreamingResponse(_errgen(), media_type="text/event-stream")
    provider, model = _active_pair(body)

    async def _gen():
        try:
            async for chunk in llm.chat_stream(provider, model, messages):
                yield chunk
        except Exception as exc:
            payload = json.dumps({"error": str(exc)}).encode()
            yield b"data: " + payload + b"\n\n"

    return StreamingResponse(_gen(), media_type="text/event-stream")


async def onboarding_endpoint(request: Request) -> JSONResponse:
    return JSONResponse(llm.onboarding_state())


async def active_endpoint(request: Request) -> JSONResponse:
    settings = llm.load_llm_settings()
    settings["keys_configured"] = llm.keys_configured()
    return JSONResponse(settings)


async def install_post_endpoint(request: Request) -> JSONResponse:
    body = await _body(request)
    engine = str(body.get("engine", ""))
    try:
        return JSONResponse(llm.start_install(engine))
    except (ValueError, RuntimeError) as exc:
        return _err(400, str(exc))


async def install_status_endpoint(request: Request) -> JSONResponse:
    engine = request.query_params.get("engine", "")
    try:
        return JSONResponse(llm.install_status(engine))
    except ValueError as exc:
        return _err(400, str(exc))


llm_router = [
    Route("/api/llm/providers", providers_endpoint, methods=["GET"]),
    Route("/api/llm/models", models_endpoint, methods=["GET"]),
    Route("/api/llm/test", test_endpoint, methods=["POST"]),
    Route("/api/llm/chat", chat_endpoint, methods=["POST"]),
    Route("/api/llm/chat/stream", chat_stream_endpoint, methods=["POST"]),
    Route("/api/llm/onboarding", onboarding_endpoint, methods=["GET"]),
    Route("/api/llm/active", active_endpoint, methods=["GET"]),
    Route("/api/llm/install", install_post_endpoint, methods=["POST"]),
    Route("/api/llm/install/status", install_status_endpoint, methods=["GET"]),
    Route("/api/settings/llm", settings_get_endpoint, methods=["GET"]),
    Route("/api/settings/llm", settings_post_endpoint, methods=["POST"]),
    Route("/api/settings/llm/key", key_delete_endpoint, methods=["DELETE"]),
]
