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
  const isDevOrPreview =
    process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";

  if (!session?.user?.id && !isDevOrPreview) {
    return <AuthGate>{null}</AuthGate>;
  }

  const userId = session?.user?.id || "dev";
  const rankUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/rank/${userId}`;

  try {
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
  } catch (err) {
    console.error("Travel page error:", err);
    return (
      <div className="max-w-5xl mx-auto px-6 py-20 text-center">
        <p className="font-serif text-xl text-[#1A1A1A]/40 mb-2">Something went wrong</p>
        <p className="text-sm text-[#1A1A1A]/40">
          The database may need a one-time setup. Try refreshing, or contact Ashley.
        </p>
      </div>
    );
  }
}
