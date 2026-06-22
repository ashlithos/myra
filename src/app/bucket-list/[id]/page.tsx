import { db } from "@/db";
import { experiences } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import ExperienceForm from "@/components/experience-form";
import AuthGate from "@/components/auth-gate";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EditExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let session;
  try { session = await auth(); } catch {}
  const isDev = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";

  if (!session?.user?.id && !isDev) {
    return <AuthGate>{null}</AuthGate>;
  }

  const userId = session?.user?.id || "dev";
  const { id } = await params;
  const result = await db
    .select()
    .from(experiences)
    .where(and(eq(experiences.id, parseInt(id)), eq(experiences.userId, userId)));

  if (result.length === 0) notFound();

  return (
    <div>
      <ExperienceForm experience={result[0]} returnTab={result[0].status} />
    </div>
  );
}
