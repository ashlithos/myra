import { handleMcpRequest } from "@/lib/mcp-handler";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

async function handler(request: Request, { params }: Ctx) {
  const { token } = await params;
  return handleMcpRequest(request, token);
}

export { handler as GET, handler as POST, handler as DELETE };
