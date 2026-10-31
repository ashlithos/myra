import { NextResponse } from "next/server";
import { getUser, unauthorized } from "@/lib/get-user";
import { createToken, getTokenStatus, revokeToken } from "@/lib/mcp-token";

export const dynamic = "force-dynamic";

/** Whether the signed-in user has a Claude key (never returns the key itself). */
export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();
  const status = await getTokenStatus(user.id!);
  return NextResponse.json({ connected: !!status, ...status });
}

/** Creates (or replaces) the key and returns it once. */
export async function POST() {
  const user = await getUser();
  if (!user) return unauthorized();
  const token = await createToken(user.id!);
  return NextResponse.json({ token }, { status: 201 });
}

export async function DELETE() {
  const user = await getUser();
  if (!user) return unauthorized();
  await revokeToken(user.id!);
  return NextResponse.json({ connected: false });
}
