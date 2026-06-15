import { db } from "@/db";
import { experiences, buddies, affinities } from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import AuthGate from "@/components/auth-gate";
import TravelDashboard from "@/components/travel-dashboard";
import type { Affinity } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TravelPage() {
  let session;
  try {
    session = await auth();
  } catch {}
  const isDev = process.env.NODE_ENV === "development";

  if (!session?.user?.id && !isDev) {
    return <AuthGate>{null}</AuthGate>;
  }

  const userId = session?.user?.id || "dev";
  const rankUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/rank/${userId}`;

  const [allExperiences, allBuddies] = await Promise.all([
    db.select().from(experiences).where(eq(experiences.userId, userId)).orderBy(desc(experiences.createdAt)),
    db.select().from(buddies).where(eq(buddies.userId, userId)),
  ]);

  let allAffinities: Affinity[] = [];
  if (allBuddies.length > 0) {
    const buddyIds = allBuddies.map((b: { id: number }) => b.id);
    const rows = await db
      .select()
      .from(affinities)
      .where(inArray(affinities.buddyId, buddyIds));
    allAffinities = rows as unknown as Affinity[];
  }

  return (
    <TravelDashboard
      experiences={allExperiences}
      initialBuddies={allBuddies}
      initialAffinities={allAffinities}
      rankUrl={rankUrl}
      userId={userId}
    />
  );
}
