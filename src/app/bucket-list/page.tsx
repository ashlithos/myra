import { db } from "@/db";
import { experiences, experiencePhotos } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import BucketListView from "@/components/bucket-list-view";
import BucketListSuggestions from "@/components/bucket-list-suggestions";
import BucketListHeader from "@/components/bucket-list-header";
import AuthGate from "@/components/auth-gate";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BucketListPage() {
  let session;
  try { session = await auth(); } catch {}
  const isDev = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";

  if (!session?.user?.id && !isDev) {
    return <AuthGate>{null}</AuthGate>;
  }

  const userId = session?.user?.id || "dev";

  try {
    const allExperiences = await db
      .select()
      .from(experiences)
      .where(eq(experiences.userId, userId))
      .orderBy(desc(experiences.createdAt));

    // Fetch first photo for each experience — filtered to user's experiences only
    const expIds = allExperiences.map((e: { id: number }) => e.id);
    const photoMap: Record<number, { url: string; altDescription: string | null }> = {};
    if (expIds.length > 0) {
      const photos = await db
        .select()
        .from(experiencePhotos)
        .where(inArray(experiencePhotos.experienceId, expIds))
        .orderBy(desc(experiencePhotos.id));
      for (const photo of photos) {
        if (!photoMap[photo.experienceId]) {
          photoMap[photo.experienceId] = {
            url: photo.url,
            altDescription: photo.altDescription,
          };
        }
      }
    }

    return (
      <div>
        <BucketListHeader />
        <BucketListView experiences={allExperiences} photoMap={photoMap} />
        <BucketListSuggestions existingNames={allExperiences.map((e: any) => e.name)} />
      </div>
    );
  } catch (err) {
    console.error("Bucket list page error:", err);
    return (
      <div>
        <BucketListHeader />
        <BucketListView experiences={[]} photoMap={{}} />
        <p className="text-center text-sm text-[#1A1A1A]/50 mt-8">
          Something went wrong loading your experiences. Please try refreshing.
        </p>
      </div>
    );
  }
}
