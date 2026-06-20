import { db } from "@/db";
import { buddies } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getUser, unauthorized } from "@/lib/get-user";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  await db
    .update(buddies)
    .set({ emoji: body.emoji })
    .where(and(eq(buddies.id, parseInt(id)), eq(buddies.userId, user.id!)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  await db
    .delete(buddies)
    .where(and(eq(buddies.id, parseInt(id)), eq(buddies.userId, user.id!)));

  return NextResponse.json({ ok: true });
}
