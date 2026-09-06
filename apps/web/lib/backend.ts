// Shared helpers for proxying dashboard requests to the teleconference FastMCP
// backend (health/diagnostics/tools facade on 10891). The backend runs in the
// same process as the FastMCP server, so tool invocation exercises the real MCP
// tools. Override with BACKEND_URL env if the backend is served elsewhere.
export const BACKEND_URL =
  process.env.BACKEND_URL || "http://127.0.0.1:10891";

export async function proxyBackend(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(`${BACKEND_URL}${path}`, init);
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return Response.json(body, { status: res.status });
}
