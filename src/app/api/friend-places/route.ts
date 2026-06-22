import { db } from "@/db";
import { friendPlaces, buddies } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getUser, unauthorized } from "@/lib/get-user";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { buddyId, name } = body as { buddyId: number; name: string };

  if (!buddyId || !name?.trim()) {
    return NextResponse.json({ error: "buddyId and name required" }, { status: 400 });
  }

  const buddy = await db
    .select()
    .from(buddies)
    .where(and(eq(buddies.id, buddyId), eq(buddies.userId, user.id!)))
    .limit(1);

  if (buddy.length === 0) {
    return NextResponse.json({ error: "Buddy not found" }, { status: 404 });
  }

  const result = await db
    .insert(friendPlaces)
    .values({ buddyId, name: name.trim() })
    .returning();

  return NextResponse.json(result[0], { status: 201 });
}

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();

  const userBuddies = await db
    .select()
    .from(buddies)
    .where(eq(buddies.userId, user.id!));

  if (userBuddies.length === 0) return NextResponse.json([]);

  const buddyIds = userBuddies.map((b: { id: number }) => b.id);
  const rows = await db
    .select()
    .from(friendPlaces)
    .where(inArray(friendPlaces.buddyId, buddyIds));

  return NextResponse.json(rows);
}
