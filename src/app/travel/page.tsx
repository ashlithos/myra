import { db } from "@/db";
import { buddies, friendPlaces } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import AuthGate from "@/components/auth-gate";
import TravelDashboard from "@/components/travel-dashboard";
import type { FriendPlace } from "@/lib/types";

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
    const allBuddies = await db.select().from(buddies).where(eq(buddies.userId, userId));

    let allFriendPlaces: FriendPlace[] = [];
    if (allBuddies.length > 0) {
      const buddyIds = allBuddies.map((b: { id: number }) => b.id);
      allFriendPlaces = await db
        .select()
        .from(friendPlaces)
        .where(inArray(friendPlaces.buddyId, buddyIds)) as FriendPlace[];
    }

    return (
      <TravelDashboard
        initialBuddies={allBuddies}
        initialFriendPlaces={allFriendPlaces}
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
