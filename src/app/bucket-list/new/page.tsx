import ExperienceForm from "@/components/experience-form";
import AuthGate from "@/components/auth-gate";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewExperiencePage() {
  let session;
  try { session = await auth(); } catch {}
  const isDev = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";

  if (!session?.user?.id && !isDev) {
    return <AuthGate>{null}</AuthGate>;
  }

  return (
    <div>
      <ExperienceForm />
    </div>
  );
}
