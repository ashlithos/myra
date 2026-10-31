import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMyraMcpServer } from "@/lib/mcp-server";
import { resolveToken } from "@/lib/mcp-token";

function jsonRpcError(status: number, message: string) {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

/**
 * Handles one MCP request (stateless: a fresh server per request, which suits
 * serverless hosting like Vercel). The key comes from the URL path
 * (/api/mcp/<key>, for Claude custom connectors) or an
 * "Authorization: Bearer <key>" header (for Claude Code and other clients).
 */
export async function handleMcpRequest(request: Request, pathToken?: string) {
  const header = request.headers.get("authorization");
  const bearer = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
  const userId = await resolveToken(pathToken ?? bearer);
  if (!userId) {
    return jsonRpcError(401, "Invalid or missing Myra key. Create one in Myra → account menu → Connect Claude.");
  }

  // Stateless mode only supports POST; there is no server-initiated stream.
  if (request.method !== "POST") return jsonRpcError(405, "Method not allowed.");

  const server = createMyraMcpServer(userId);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    // JSON responses are fully built by now, so it's safe to clean up.
    void transport.close();
    void server.close();
  }
}
