import { db } from "@/db";
import { friendPlaces, buddies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getUser, unauthorized } from "@/lib/get-user";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const placeId = parseInt(id);

  const place = await db
    .select({ buddyId: friendPlaces.buddyId })
    .from(friendPlaces)
    .where(eq(friendPlaces.id, placeId))
    .limit(1);

  if (place.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buddy = await db
    .select()
    .from(buddies)
    .where(eq(buddies.id, place[0].buddyId))
    .limit(1);

  if (buddy.length === 0 || buddy[0].userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(friendPlaces).where(eq(friendPlaces.id, placeId));
  return NextResponse.json({ ok: true });
}
