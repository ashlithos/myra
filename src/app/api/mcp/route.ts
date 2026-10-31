import { handleMcpRequest } from "@/lib/mcp-handler";

export const dynamic = "force-dynamic";

// Same endpoint, authenticated with an "Authorization: Bearer <key>" header.
async function handler(request: Request) {
  return handleMcpRequest(request);
}

export { handler as GET, handler as POST, handler as DELETE };
