import { db } from "@/db";
import { experiences, buddies, affinities } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Public endpoint — no auth — serves the friend-facing /rank/[userId] page
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const [exps, buds] = await Promise.all([
    db.select().from(experiences).where(eq(experiences.userId, userId)),
    db.select().from(buddies).where(eq(buddies.userId, userId)),
  ]);

  // Include existing affinities so returning friends see their prior ratings
  let existingAffinities: typeof affinities.$inferSelect[] = [];
  if (buds.length > 0) {
    const buddyIds = buds.map((b: { id: number }) => b.id);
    existingAffinities = await db
      .select()
      .from(affinities)
      .where(inArray(affinities.buddyId, buddyIds));
  }

  return NextResponse.json({ experiences: exps, buddies: buds, affinities: existingAffinities });
}
