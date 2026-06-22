import { db } from "@/db";
import { affinities, buddies, experiences } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getUser, unauthorized } from "@/lib/get-user";
import type { AffinityTier } from "@/lib/types";

// Owner removes a single place from a friend — auth required
export async function DELETE(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const buddyId = parseInt(searchParams.get("buddyId") ?? "");
  const experienceId = parseInt(searchParams.get("experienceId") ?? "");

  if (!buddyId || !experienceId) {
    return NextResponse.json({ error: "buddyId and experienceId required" }, { status: 400 });
  }

  const buddy = await db
    .select()
    .from(buddies)
    .where(and(eq(buddies.id, buddyId), eq(buddies.userId, user.id!)))
    .limit(1);

  if (buddy.length === 0) {
    return NextResponse.json({ error: "Buddy not found" }, { status: 404 });
  }

  await db
    .delete(affinities)
    .where(and(eq(affinities.buddyId, buddyId), eq(affinities.experienceId, experienceId)));

  return NextResponse.json({ ok: true });
}

// Ashley reads the full matrix — auth required
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
    .from(affinities)
    .where(inArray(affinities.buddyId, buddyIds));

  return NextResponse.json(rows);
}

// Friends submit ratings — no auth; buddyId must belong to the ownerUserId passed in body
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { buddyId, ownerUserId, ratings } = body as {
    buddyId: number;
    ownerUserId: string;
    ratings: { experienceId: number; tier: AffinityTier }[];
  };

  if (!buddyId || !ownerUserId || !Array.isArray(ratings)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Verify the buddy belongs to the owner
  const buddy = await db
    .select()
    .from(buddies)
    .where(and(eq(buddies.id, buddyId), eq(buddies.userId, ownerUserId)))
    .limit(1);

  if (buddy.length === 0) {
    return NextResponse.json({ error: "Buddy not found" }, { status: 404 });
  }

  // Verify all experiences belong to the owner
  const expIds = ratings.map((r) => r.experienceId);
  const validExps = await db
    .select({ id: experiences.id })
    .from(experiences)
    .where(and(eq(experiences.userId, ownerUserId), inArray(experiences.id, expIds)));

  const validIds = new Set(validExps.map((e: { id: number }) => e.id));
  const validRatings = ratings.filter((r) => validIds.has(r.experienceId));

  const now = new Date().toISOString();

  for (const { experienceId, tier } of validRatings) {
    const existing = await db
      .select()
      .from(affinities)
      .where(
        and(eq(affinities.buddyId, buddyId), eq(affinities.experienceId, experienceId))
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(affinities)
        .set({ tier, updatedAt: now })
        .where(eq(affinities.id, existing[0].id));
    } else {
      await db.insert(affinities).values({ buddyId, experienceId, tier, updatedAt: now });
    }
  }

  return NextResponse.json({ ok: true, saved: validRatings.length });
}
