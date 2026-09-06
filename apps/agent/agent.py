"""
apps/agent/agent.py — AG-Visio Voice Agent
LiveKit Agents 1.8 compatible. Implements a custom Ollama LLM backend
with dynamic MCP tool discovery and delegation.

Notes on Agents 1.7/1.8:
- PII redaction tags trace/log keys as lk.pii.* — keep transcripts at
  DEBUG, never INFO, so local logs stay clean for Loki.
- Expressive mode (AgentSession expressive=True) requires an inference
  TTS voice; local Piper mode intentionally leaves it off.
"""

import asyncio
import json
import logging
import os
import sys
from typing import Annotated, Any

import aiohttp
import ollama
from contacts_substrate import ContactManager
from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    JobContext,
    WorkerOptions,
    cli,
    llm,
)

try:
    from livekit.agents.job import AutoRestartPolicy
except ImportError:
    AutoRestartPolicy = None
from livekit.agents.llm import LLMStream, function_tool
from livekit.agents.voice import AgentSession
from livekit.plugins import (
    deepgram,
    openai,
    silero,
)
from logic import ReductionistLogic
from mcp import ClientSession
from mcp.client.sse import sse_client
from memory_substrate import MemorySubstrate
from state_bus import StateBus
from transcription_substrate import TranscriptionSubstrate
from vision_analyze import VisionSubstrate

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("agent_industrial.log"),
    ],
)
logger = logging.getLogger("ag-visio-agent")

load_dotenv()

# UserTurnLimitOptions (Agents 1.5.12+, still current in 1.8.0).
# Caps user speech duration to prevent long monologues from hijacking the agent.
try:
    from livekit.agents.voice import UserTurnLimitOptions

    _turn_limit_options = UserTurnLimitOptions(max_user_turn_duration=60.0)
except ImportError:
    _turn_limit_options = None

# ===========================================================================
# MCP DISCOVERY
# ===========================================================================


async def discover_local_mcp_endpoints(start_port: int = 10700, end_port: int = 10800):
    logger.info(f"Scanning for local MCP servers in range {start_port}-{end_port}...")
    found_endpoints = []
    async with aiohttp.ClientSession() as session:
        tasks = []
        for port in range(start_port, end_port + 1):
            url = f"http://localhost:{port}/mcp"
            tasks.append(check_endpoint(session, url))
        results = await asyncio.gather(*tasks)
        found_endpoints = [url for url in results if url]
    logger.info(f"Discovery complete. Found {len(found_endpoints)} MCP servers: {found_endpoints}")
    return found_endpoints


async def check_endpoint(session, url):
    try:
        async with session.get(url, timeout=0.5) as response:
            if response.status == 200:
                return url
    except (TimeoutError, aiohttp.ClientError):
        pass
    return None


AGENT_MODE = os.environ.get("AGENT_MODE", "local").lower()
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434/v1")


# ---------------------------------------------------------------------------
# Custom LLM: Ollama backend (livekit-agents 1.x pattern)
# ---------------------------------------------------------------------------


class SOTAOllamaLLMStream(LLMStream):
    def __init__(
        self,
        ollama_llm: "SOTAOllamaLLM",
        *,
        chat_ctx: llm.ChatContext,
        conn_options: Any,
        fnc_ctx: llm.ToolContext | None,
    ) -> None:
        super().__init__(ollama_llm, chat_ctx=chat_ctx, conn_options=conn_options, fnc_ctx=fnc_ctx)

    async def _run(self) -> None:
        llm_instance: SOTAOllamaLLM = self._llm
        try:
            messages: list[dict[str, str]] = []
            for msg in self._chat_ctx.messages:
                content = msg.content
                if isinstance(content, list):
                    content = " ".join(block.text if hasattr(block, "text") else str(block) for block in content)
                messages.append({"role": msg.role, "content": content or ""})

            logger.debug("Sending chat request to Ollama: %d messages", len(messages))
            response = await llm_instance._client.chat(
                model=llm_instance._model,
                messages=messages,
                stream=True,
            )

            async for chunk in response:
                delta_content = ""
                if isinstance(chunk, dict):
                    delta_content = (chunk.get("message") or {}).get("content", "")
                elif hasattr(chunk, "message"):
                    delta_content = getattr(chunk.message, "content", "") or ""

                if not delta_content:
                    continue

                self._event_ch.send_nowait(
                    llm.ChatChunk(
                        choices=[
                            llm.Choice(
                                delta=llm.ChoiceDelta(
                                    role="assistant",
                                    content=delta_content,
                                )
                            )
                        ]
                    )
                )

        except Exception as exc:
            logger.error("Ollama interaction failed: %s", exc)
            self._event_ch.send_nowait(
                llm.ChatChunk(
                    choices=[
                        llm.Choice(
                            delta=llm.ChoiceDelta(
                                role="assistant",
                                content="[DETACHED] LLM Substrate Connection Error. Please verify Ollama is running.",
                            )
                        )
                    ]
                )
            )


class SOTAOllamaLLM(llm.LLM):
    def __init__(self, model: str = "llama3.1", base_url: str | None = None) -> None:
        super().__init__()
        self._model = model
        self._client = ollama.AsyncClient(host=base_url or OLLAMA_BASE_URL)
        logger.info("Initialized Ollama LLM with model: %s", model)

    def chat(
        self,
        *,
        chat_ctx: llm.ChatContext,
        conn_options: Any = None,
        fnc_ctx: llm.ToolContext | None = None,
    ) -> SOTAOllamaLLMStream:
        return SOTAOllamaLLMStream(
            self,
            chat_ctx=chat_ctx,
            conn_options=conn_options,
            fnc_ctx=fnc_ctx,
        )


# ===========================================================================
# DYNAMIC MCP TOOL PROVIDER
# ===========================================================================


class CombinedMCPFunctionContext(llm.ToolContext):
    """
    Orchestrates local VisioTools with dynamic remote MCP tools.
    Provides a unified interface for the VoicePipelineAgent.
    """

    def __init__(
        self,
        logic: ReductionistLogic,
        memory: MemorySubstrate,
        room: rtc.Room,
        contacts: ContactManager,
    ):
        super().__init__()
        self._logic = logic
        self._memory = memory
        self._room = room
        self._contacts = contacts
        self._mcp_sessions: list[tuple[str, ClientSession]] = []
        self._discovered_tool_names: list[str] = []

    async def initialize_mcp(self, endpoints: list[str]):
        """Initialize connections to discovered MCP servers and register their tools."""
        for url in endpoints:
            try:
                logger.info(f"Connecting to MCP server at {url}...")
                read, write = await sse_client(url)
                session = await ClientSession(read, write).__aenter__()
                await session.initialize()
                tools_result = await session.list_tools()
                discovered = []
                for tool in tools_result.tools:
                    discovered.append(tool.name)
                    logger.info(f"Discovered tool: {tool.name} from {url}")
                self._mcp_sessions.append((url, session))
                self._discovered_tool_names.extend(discovered)
                logger.info(f"Registered {len(discovered)} tools from {url}")
            except Exception as e:
                logger.error(f"Failed to connect to MCP server {url}: {e}")

    async def call_mcp_tool(self, server_url: str, tool_name: str, arguments: dict[str, Any]) -> str:
        """Call a tool on a connected MCP server by URL."""
        for url, session in self._mcp_sessions:
            if url == server_url:
                try:
                    result = await session.call_tool(tool_name, arguments)
                    if hasattr(result, "content"):
                        content = result.content
                        if isinstance(content, list):
                            return "\n".join(str(item) for item in content)
                        return str(content)
                    return str(result)
                except Exception as e:
                    logger.error(f"MCP tool call failed: {tool_name} on {url}: {e}")
                    return f"[MCP Error] {e}"
        return f"[MCP Error] No session for server {server_url}"

    async def list_all_mcp_tools(self) -> str:
        """List all dynamically discovered MCP tools across all servers."""
        lines = []
        for url, session in self._mcp_sessions:
            try:
                tools = await session.list_tools()
                for t in tools.tools:
                    lines.append(f"[{url}] {t.name}: {t.description}")
            except Exception:
                lines.append(f"[{url}] <unreachable>")
        return "\n".join(lines) if lines else "No MCP tools discovered."

    async def delegate_to_mcp(self, server_hint: str, tool_name: str, arguments: str) -> str:
        """Route a tool call to an MCP server matching the hint, or the first available."""
        if not self._mcp_sessions:
            return "[MCP Error] No MCP servers connected."

        target_url = None
        for url, _ in self._mcp_sessions:
            if server_hint in url:
                target_url = url
                break

        if not target_url:
            target_url = self._mcp_sessions[0][0]

        try:
            parsed_args = json.loads(arguments) if arguments else {}
        except json.JSONDecodeError:
            parsed_args = {"text": arguments}

        return await self.call_mcp_tool(target_url, tool_name, parsed_args)

    @function_tool(description="Search the user's address book for contact information.")
    async def search_contacts(self, query: Annotated[str, "The name, email, or company to search for."]) -> str:
        results = self._contacts.search(query)
        return "\n".join([f"- {c.name} ({c.email})" for c in results]) if results else "No matches."

    @function_tool(description="Search the knowledge base for repository context or history.")
    async def search_knowledge_base(self, query: Annotated[str, "The semantic search query."]) -> str:
        h = self._memory.query_history(query, limit=3)
        c = self._memory.query_codebase(query, limit=2)
        res = [f"History: {hit['text']}" for hit in h] + [f"Code: {hit['text'][:100]}" for hit in c]
        return "\n".join(res) if res else "No context found."

    @function_tool(description="Generate a summary of the current meeting and persist it.")
    async def meeting_intelligence_summary(self) -> str:
        result = await self.delegate_to_mcp(
            "conferencing",
            "generate_meeting_summary",
            json.dumps({"room_name": self._room.name if self._room else "unknown", "transcript": "[streaming]"}),
        )
        return result

    @function_tool(description="Analyzes discourse for semantic dilution or jargon overflow.")
    def analyze_discourse(
        self,
        text: Annotated[str, "The text to analyze for LDDO (Low-Density Discourse Objects)"],
    ) -> str:
        dilution = self._logic.analyze_saliency(text)
        if dilution >= 0.7:
            return f"CRITICAL: Discourse dilution at {dilution:.2f}. Ontological drift detected."
        return f"Discourse nominal. Dilution: {dilution:.2f}."

    @function_tool(
        description="Requests proactive remote assistance. Use when the user is struggling with technical tasks."
    )
    async def request_remote_access(
        self,
        reason: Annotated[str, "The specific technical reason why remote access is required."],
    ) -> str:
        logger.info("Visio requesting remote access substrate. Reason: %s", reason)
        payload = json.dumps({"type": "remote_request", "reason": reason})
        if self._room and self._room.isconnected():
            await self._room.local_participant.publish_data(payload)
        return (
            f"REQUEST_INITIATED: Remote assistance substrate requested for: {reason}. "
            "Prompting user for secure credential handoff."
        )

    @function_tool(description="List all MCP tools discovered from connected servers.")
    async def list_mcp_tools(self) -> str:
        return await self.list_all_mcp_tools()


# ---------------------------------------------------------------------------
# Agent entrypoint
# ---------------------------------------------------------------------------


async def entrypoint(ctx: JobContext) -> None:
    logger.info("Initializing Agent Substrate [Teams++]...")

    logic_engine = ReductionistLogic()

    memory = MemorySubstrate()
    VisionSubstrate(mode=AGENT_MODE)
    bus = StateBus()
    await bus.connect()
    contacts = ContactManager()
    contacts.load_cache()

    mcp_endpoints = await discover_local_mcp_endpoints()

    try:
        fnc_ctx = CombinedMCPFunctionContext(logic_engine, memory, ctx.room, contacts)
        _mcp_init_task = asyncio.create_task(fnc_ctx.initialize_mcp(mcp_endpoints))  # noqa: RUF006

        await ctx.connect()
        logger.info("Connected to room: %s", ctx.room.name)

        # Start multi-participant transcription
        transcriber = TranscriptionSubstrate(ctx.room, mode=AGENT_MODE)
        await transcriber.start()

        vad = silero.VAD.load()
        if AGENT_MODE == "cloud":
            logger.info("Using Cloud providers (Deepgram/OpenAI)")
            stt = deepgram.STT()
            tts = openai.TTS()
            llm_engine = openai.LLM(model="gpt-4o-mini")
        else:
            logger.info("Using Local providers (Whisper via OpenAI/Piper/Ollama)")
            stt = openai.STT(model="whisper-1")
            tts = __import__("livekit.plugins.piper", fromlist=["TTS"]).TTS()
            llm_engine = SOTAOllamaLLM(model="llama3.1")

        assistant_kwargs = {
            "vad": vad,
            "stt": stt,
            "llm": llm_engine,
            "tts": tts,
            "turn_handling": "auto",
            "tools": fnc_ctx,
        }
        if _turn_limit_options:
            assistant_kwargs["turn_limit"] = _turn_limit_options

        assistant = AgentSession(**assistant_kwargs)

        @ctx.room.on("data_received")
        def on_data_received(data: rtc.DataPacket):
            try:
                payload = json.loads(data.data.decode())
                p_type = payload.get("type")

                if p_type == "remote_credentials":
                    target_id = payload.get("id")
                    pw = payload.get("password")
                    if target_id and pw:
                        logic_engine.set_remote_credentials(target_id, pw)
                        logger.info("Remote credentials received via data channel")

                elif p_type == "request_intelligence":
                    logger.info("Intelligence requested by UI. Triggering summarization...")

                    async def _broadcast_intel():
                        # Forward to conferencing MCP via delegation
                        summary = await fnc_ctx.delegate_to_mcp(
                            "conferencing",
                            "generate_meeting_summary",
                            json.dumps({"room_name": ctx.room.name, "transcript": "[streaming from agent]"}),
                        )
                        intel_payload = json.dumps(
                            {
                                "type": "intelligence_update",
                                "intelligence_type": "summary",
                                "content": summary,
                            }
                        )
                        await ctx.room.local_participant.publish_data(intel_payload.encode())

                    _intel_task = asyncio.create_task(_broadcast_intel())  # noqa: RUF006

            except Exception as e:
                logger.error("Failed to parse data packet: %s", e)

        assistant.start(ctx.room)
        await assistant.say("Visio Substrate Operational. Discovery Complete.")

    except Exception as exc:
        logger.critical("Failed to initialize session. %s", exc)
        if ctx.room.isconnected():
            await ctx.room.disconnect()
    finally:
        await bus.disconnect()
        try:
            await transcriber.stop()
        except Exception:
            logger.debug("Transcriber stop failed", exc_info=True)


if __name__ == "__main__":
    _worker_kwargs = {"entrypoint_fnc": entrypoint}
    if AutoRestartPolicy is not None:
        _worker_kwargs["job_restart_policy"] = AutoRestartPolicy.ALWAYS
    cli.run_app(WorkerOptions(**_worker_kwargs))
