import { db } from "@/db";
import { experiences, experiencePhotos } from "@/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import HomeContent from "@/components/home-content";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  let session;
  try { session = await auth(); } catch {}
  const userId = session?.user?.id || "";

  const counts = await db
    .select({
      status: experiences.status,
      count: sql<number>`count(*)`,
    })
    .from(experiences)
    .where(eq(experiences.userId, userId))
    .groupBy(experiences.status);

  const countMap: Record<string, number> = {};
  for (const row of counts) {
    countMap[row.status] = row.count;
  }

  // Fetch gallery photos from user's experiences
  let galleryItems: { name: string; url: string; thumbUrl: string }[] = [];
  try {
    const userExps = await db
      .select({ id: experiences.id, name: experiences.name })
      .from(experiences)
      .where(eq(experiences.userId, userId));
    const expIds = userExps.map((e: { id: number; name: string }) => e.id);
    if (expIds.length > 0) {
      const photos = await db
        .select({
          experienceId: experiencePhotos.experienceId,
          url: experiencePhotos.url,
          thumbUrl: experiencePhotos.thumbUrl,
        })
        .from(experiencePhotos)
        .where(inArray(experiencePhotos.experienceId, expIds));
      const nameMap = Object.fromEntries(userExps.map((e: { id: number; name: string }) => [e.id, e.name]));
      galleryItems = photos.map((p: { experienceId: number; url: string; thumbUrl: string }) => ({
        name: nameMap[p.experienceId] || "",
        url: p.url,
        thumbUrl: p.thumbUrl,
      }));
    }
  } catch {}

  return (
    <HomeContent
      wishlistCount={countMap["wishlist"] || 0}
      plannedCount={countMap["planned"] || 0}
      visitedCount={countMap["visited"] || 0}
      galleryItems={galleryItems}
    />
  );
}
