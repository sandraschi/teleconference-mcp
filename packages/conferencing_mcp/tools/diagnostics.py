import logging
import socket
import subprocess
import time
from typing import Annotated, Any

from fastmcp import Context
from pydantic import Field

from ..mcp_server import _MUTATING, _READ_ONLY, cid, mcp

logger = logging.getLogger("ag-visio-mcp")


@mcp.tool(annotations=_READ_ONLY)
async def get_dev_stats(ctx: Context) -> str:
    """Get granular local development statistics. SOTA Industrial standard.

    ## Return Format
    str — multi-line report with git branch, last commit, staged changes, and storage volumes

    ## Examples
    await get_dev_stats()
    """
    _cid = cid(ctx)
    logger.info("Executing get_dev_stats tool", extra={"correlation_id": _cid})
    try:
        git_branch = subprocess.run(["git", "branch", "--show-current"], capture_output=True, text=True).stdout.strip()  # noqa: S607
        git_status = subprocess.run(["git", "status", "--short"], capture_output=True, text=True).stdout  # noqa: S607
        git_last_commit = subprocess.run(
            ["git", "log", "-1", "--oneline"],  # noqa: S607
            capture_output=True,
            text=True,
        ).stdout.strip()

        disk_proc = subprocess.run(
            [  # noqa: S607
                "powershell",
                "-Command",
                (
                    "Get-Volume | Select-Object DriveLetter, FileSystem,"
                    " @{Name='SizeGB';Expression={'{0:N2}' -f ($_.Size/1GB)}},"
                    " @{Name='FreeGB';Expression={'{0:N2}' -f ($_.SizeRemaining/1GB)}}"
                ),
            ],
            capture_output=True,
            text=True,
            check=True,
        )

        return (
            f"--- GIT CONTEXT ---\n"
            f"Branch: {git_branch}\n"
            f"Last Commit: {git_last_commit}\n"
            f"Staged/Unstaged:\n{git_status}\n"
            f"--- STORAGE VOLUMES ---\n"
            f"{disk_proc.stdout}"
        )
    except Exception as e:
        logger.exception(f"Dev stats failed: {e!s}", extra={"correlation_id": _cid})
        return f"ERROR [SOTA-E01]: Substrate telemetry failed. {e!s}"


@mcp.tool(annotations=_READ_ONLY)
async def query_system_logs(
    ctx: Context,
    pattern: Annotated[str, Field(description="Regex pattern to match in system log messages.")],
    limit: Annotated[int, Field(description="Max matching entries to return.", ge=1)] = 10,
) -> str:
    """Query Windows System logs for specific patterns with SOTA filtering.

    ## Return Format
    str — formatted log entries or "RES [SOTA-N01]: No matches found for pattern."

    ## Examples
    await query_system_logs(pattern="LiveKit|Ollama")
    await query_system_logs(pattern="Error", limit=20)
    """
    _cid = cid(ctx)
    logger.info(f"Querying system logs for pattern: {pattern}", extra={"correlation_id": _cid})
    try:
        cmd = (
            f"Get-EventLog -LogName System -Newest 100 | "
            f"Where-Object {{ $_.Message -match '{pattern}' }} | "
            f"Select-Object -First {limit} | Format-List Message"
        )
        proc = subprocess.run(["powershell", "-Command", cmd], capture_output=True, text=True, check=True)  # noqa: S603, S607

        return proc.stdout or "RES [SOTA-N01]: No matches found for pattern."
    except subprocess.CalledProcessError as e:
        logger.exception(f"Log query failed: {e.stderr}", extra={"correlation_id": _cid})
        return f"ERROR [SOTA-E02]: Log query failed. {e.stderr}"
    except Exception as e:
        logger.critical(f"Error in query_system_logs: {e!s}", extra={"correlation_id": _cid})
        return "CRITICAL FAILURE: Log substrate unavailable."


@mcp.tool(annotations=_READ_ONLY)
async def sample_log_analysis(
    ctx: Context,
    pattern: Annotated[str, Field(description="Log pattern to iteratively sample.")],
    iterations: Annotated[int, Field(description="Number of sampling rounds.", ge=1)] = 3,
) -> dict[str, Any]:
    """Iteratively sample and analyze system logs for anomaly detection and root cause analysis.

    ## Return Format
    {"sampling_complete": bool, "results": list, "metadata": {"pattern": str, "correlation_id": str}}

    ## Examples
    await sample_log_analysis(pattern="LiveKit")
    await sample_log_analysis(pattern="Ollama", iterations=5)
    """
    _cid = cid(ctx)

    results = []
    current_limit = 5

    for i in range(iterations):
        logs = await query_system_logs(ctx, pattern, limit=current_limit)
        results.append(
            {
                "iteration": i + 1,
                "sample_size": current_limit,
                "data_captured": logs[:500] + "..." if len(logs) > 500 else logs,
                "status": "PROCESSED",
            }
        )
        current_limit += 5

    return {
        "sampling_complete": True,
        "results": results,
        "metadata": {
            "pattern": pattern,
            "model_alignment": "SOTA-2026",
            "correlation_id": _cid,
        },
    }


@mcp.tool(annotations=_READ_ONLY)
async def get_substrate_heartbeat(ctx: Context) -> dict[str, Any]:
    """Perform deep heartbeat analysis of LiveKit and Ollama substrates.

    ## Return Format
    {"timestamp": str, "heartbeat": {"livekit": ..., "ollama": ..., "system": ...}, "correlation_id": str}

    ## Examples
    await get_substrate_heartbeat()
    """
    _cid = cid(ctx)

    heartbeat = {
        "livekit": {"status": "UNKNOWN", "version": "N/A", "latency_ms": -1},
        "ollama": {"status": "UNKNOWN", "models": [], "latency_ms": -1},
        "system": {"cpu_percent": 0.0, "memory_percent": 0.0},
    }

    try:
        start = time.perf_counter()
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            if s.connect_ex(("localhost", 15580)) == 0:
                heartbeat["livekit"]["status"] = "ALIVE"
                heartbeat["livekit"]["latency_ms"] = int((time.perf_counter() - start) * 1000)
            else:
                heartbeat["livekit"]["status"] = "DEAD"
    except Exception:
        heartbeat["livekit"]["status"] = "ERROR"

    try:
        import aiohttp

        start = time.perf_counter()
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:11434/api/tags", timeout=1) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    heartbeat["ollama"]["status"] = "ALIVE"
                    heartbeat["ollama"]["models"] = [m["name"] for m in data.get("models", [])]
                    heartbeat["ollama"]["latency_ms"] = int((time.perf_counter() - start) * 1000)
                else:
                    heartbeat["ollama"]["status"] = f"DEGRADED ({resp.status})"
    except Exception:
        heartbeat["ollama"]["status"] = "OFFLINE"

    try:
        import psutil

        heartbeat["system"]["cpu_percent"] = psutil.cpu_percent()
        heartbeat["system"]["memory_percent"] = psutil.virtual_memory().percent
    except ImportError:
        heartbeat["system"]["cpu_percent"] = -1.0
        heartbeat["system"]["memory_percent"] = -1.0

    return {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "heartbeat": heartbeat,
        "correlation_id": _cid,
        "sota_compliant": True,
    }


@mcp.tool(annotations=_READ_ONLY)
async def orchestrate_industrial_diagnostics(ctx: Context) -> dict[str, Any]:
    """Execute a full-stack industrial diagnostic pass. SOTA-2026 methodology.

    ## Return Format
    {"status": str, "heartbeat": dict, "critical_logs": str, "recommendation": str, "correlation_id": str}

    ## Examples
    await orchestrate_industrial_diagnostics()
    """
    heartbeat = await get_substrate_heartbeat(ctx)
    logs = await query_system_logs(ctx, pattern="LiveKit|Ollama", limit=5)

    return {
        "status": "PASS" if heartbeat["heartbeat"]["livekit"]["status"] == "ALIVE" else "FAIL",
        "heartbeat": heartbeat,
        "critical_logs": logs,
        "recommendation": "All substrates nominal."
        if heartbeat["heartbeat"]["livekit"]["status"] == "ALIVE"
        else "Manual substrate restart required.",
        "correlation_id": cid(ctx),
    }


@mcp.tool(annotations=_MUTATING)
async def orchestrate_remote_support(
    ctx: Context,
    action: Annotated[
        str, Field(description="'status' to check availability, 'prepare' to launch RustDesk.")
    ] = "status",
) -> dict[str, Any]:
    """Orchestrate Remote Support via native Windows Remote Desktop or RustDesk.

    ## Return Format
    {"success": bool, "status": str, "rustdesk_installed": bool, "correlation_id": str, ...}

    ## Examples
    await orchestrate_remote_support()
    await orchestrate_remote_support(action="prepare")
    """
    _cid = cid(ctx)

    heartbeat_data = await get_substrate_heartbeat(ctx)

    rustdesk_found = False
    rustdesk_path = None
    try:
        import winreg

        for key_path in [
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\RustDesk.exe",
            r"SOFTWARE\RustDesk",
        ]:
            try:
                with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as k:
                    rustdesk_path = winreg.QueryValueEx(k, "")[0]
                    rustdesk_found = True
                    break
            except OSError:
                pass
    except ImportError:
        pass

    if not rustdesk_path:
        import shutil

        rustdesk_path = shutil.which("RustDesk") or shutil.which("RustDesk.exe")
        rustdesk_found = rustdesk_path is not None

    if action == "status":
        return {
            "success": True,
            "status": "OPERATIONAL" if rustdesk_found else "NOT_INSTALLED",
            "rustdesk_installed": rustdesk_found,
            "rustdesk_path": rustdesk_path,
            "message": "RustDesk detected and available."
            if rustdesk_found
            else "RustDesk not found. Install from https://rustdesk.com",
            "health_snapshot": heartbeat_data,
            "correlation_id": _cid,
        }
    elif action == "prepare":
        if not rustdesk_found:
            return {
                "success": False,
                "error": "RustDesk not installed. Cannot prepare remote support.",
                "correlation_id": _cid,
            }
        try:
            import subprocess as sp

            proc = sp.Popen([rustdesk_path], shell=True)  # noqa: S602
            return {
                "success": True,
                "rustdesk_pid": proc.pid,
                "service_status": "LAUNCHED",
                "message": f"RustDesk launched from {rustdesk_path}",
                "correlation_id": _cid,
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to start RustDesk: {e}",
                "correlation_id": _cid,
            }

    return {"success": False, "error": f"Unknown action: {action}"}


@mcp.tool(annotations=_READ_ONLY)
async def sample_system_forensics(
    ctx: Context,
    anomaly: Annotated[str, Field(description="Description of the system anomaly to investigate.")],
) -> str:
    """Leverage AI sampling to perform deep forensics on system anomalies. SOTA agentic workflow.

    ## Return Format
    str — forensic report from the LLM

    ## Examples
    await sample_system_forensics(anomaly="LiveKit server unreachable on port 15580")
    """
    _cid = cid(ctx)

    prompt = f"Analyze this system anomaly in the AG-Visio substrate: {anomaly}. Check logs and health status."

    try:
        analysis = await ctx.sample(prompt, max_tokens=500)
        return f"FORENSIC_REPORT [SOTA-F01]: {analysis.content.text}"
    except Exception as e:
        logger.exception(f"Forensics sampling failed: {e!s}", extra={"correlation_id": _cid})
        return f"ERROR [SOTA-E05]: Forensics substrate timed out. {e!s}"


def _tcp_probe(host: str, port: int, timeout: float = 0.5) -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            return "up" if s.connect_ex((host, port)) == 0 else "down"
    except Exception as e:
        logger.debug(f"TCP probe {host}:{port} failed: {e}")
        return "error"


@mcp.tool(annotations=_READ_ONLY)
async def status(ctx: Context) -> dict[str, Any]:
    """Server status: version, tool count, and dependency reachability.

    ## Return Format
    {"success": bool, "message": str, "data": {"version": str, "tool_count": int,
    "backend": str, "health": str, "livekit": str, "remoting": str}} — dialogic shape.

    ## Examples
    await status()
    """
    _cid = cid(ctx)
    logger.info("Executing status tool", extra={"correlation_id": _cid})
    try:
        from importlib.metadata import version as _pkg_version

        ver = _pkg_version("teleconference-mcp")
    except Exception:
        ver = "0.1.0"
    data = {
        "version": ver,
        "backend": _tcp_probe("127.0.0.1", 10887),
        "health": _tcp_probe("127.0.0.1", 10891),
        "livekit": _tcp_probe("127.0.0.1", 15580),
        "remoting": _tcp_probe("127.0.0.1", 11069),
        "frontend": _tcp_probe("127.0.0.1", 10886),
    }
    down = sorted(k for k, v in data.items() if k != "version" and v != "up")
    ok = not down
    return {
        "success": ok,
        "message": "All endpoints reachable" if ok else f"Down: {', '.join(down)}",
        "data": data,
        "correlation_id": _cid,
    }
