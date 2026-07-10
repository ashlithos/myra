import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { experiences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/get-user";

type InferResult = { id: number; location: string | null; locality: string };

const SYSTEM_PROMPT = `You infer the real-world location of bucket-list experiences and classify each as "local" or "travel" relative to Sunnyvale, California.

For each experience you are given (id, name, optional description, optional country), determine:

1. "location": a concise human-readable place string, e.g. "Monterey, CA", "Lake Tahoe, CA", "Kyoto, Japan". Use the most specific place implied by the name/description. If no real-world location can be determined (a generic activity like "learn to surf" or "host a dinner party" with no place), set location to null.

2. "locality": one of exactly "local", "travel", or "unknown".
   - "local" = within roughly an 8-hour drive (~500 driving miles) of Sunnyvale, CA. This includes essentially ALL of California (San Francisco Bay Area, Monterey/Big Sur, Yosemite, Lake Tahoe, Mendocino, Los Angeles, San Diego), western Nevada (Reno, Tahoe), and southern Oregon (Ashland, Crater Lake area). Las Vegas is borderline but still counts as local (~8-9h drive).
   - "travel" = requires flying or a drive longer than ~8 hours: the Pacific Northwest beyond southern Oregon (Portland, Seattle), the rest of the United States, and anywhere international.
   - "unknown" = only when location is null (no determinable place).

Respond with ONLY valid JSON, no markdown:
{"results":[{"id":123,"location":"Monterey, CA","locality":"local"}]}`;

function buildUserMessage(items: { id: number; name: string; description: string | null; country: string }[]) {
  return items
    .map((e) => {
      const parts = [`id ${e.id}: "${e.name}"`];
      if (e.description) parts.push(`— ${e.description}`);
      if (e.country) parts.push(`(country: ${e.country})`);
      return parts.join(" ");
    })
    .join("\n");
}

export async function POST() {
  const user = await getUser();
  if (!user) return unauthorized();

  const apiKey = process.env.TRAVEL_PLANNER_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 });
  }
  const client = new Anthropic({ apiKey });

  const all = await db.select().from(experiences).where(eq(experiences.userId, user.id!));

  // Candidates: missing an explicit location, or missing a locality classification.
  const candidates = all.filter(
    (e: { city: string | null; locality: string }) =>
      !e.city || e.city.trim() === "" || !e.locality || e.locality.trim() === ""
  );

  if (candidates.length === 0) {
    return NextResponse.json({ updated: 0, candidates: 0 });
  }

  // Batch to keep prompts and JSON parsing reliable.
  const BATCH = 40;
  const inferred: InferResult[] = [];
  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    try {
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserMessage(batch) }],
      });
      const text = message.content[0]?.type === "text" ? message.content[0].text : "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) continue;
      const parsed = JSON.parse(match[0]) as { results?: InferResult[] };
      if (Array.isArray(parsed.results)) inferred.push(...parsed.results);
    } catch (err) {
      console.error("backfill-locations batch error:", err instanceof Error ? err.message : err);
    }
  }

  // Apply: only fill blanks — never overwrite a location or locality the user already set.
  const byId = new Map(all.map((e: { id: number }) => [e.id, e]));
  let updated = 0;
  for (const r of inferred) {
    const exp = byId.get(r.id) as { city: string | null; locality: string } | undefined;
    if (!exp) continue;
    const set: { city?: string; locality?: string } = {};
    if ((!exp.city || exp.city.trim() === "") && r.location) set.city = r.location;
    if ((!exp.locality || exp.locality.trim() === "") && (r.locality === "local" || r.locality === "travel")) {
      set.locality = r.locality;
    }
    if (Object.keys(set).length === 0) continue;
    await db.update(experiences).set(set).where(eq(experiences.id, r.id));
    updated++;
  }

  return NextResponse.json({ updated, candidates: candidates.length });
}
