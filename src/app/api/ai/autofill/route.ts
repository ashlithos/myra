import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { lookupTravelInfo } from "@/lib/travel-knowledge";

export async function POST(request: NextRequest) {
  const { name } = await request.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // 1) Instant local knowledge base (well-known events + destinations) — free & fast.
  const localResult = lookupTravelInfo(name);
  if (localResult) {
    return NextResponse.json(localResult);
  }

  // 2) Ask Claude. Unlike a keyword/Wikipedia scan, it understands holidays,
  //    festivals, and seasonal activities (e.g. "Christmas in Vienna" -> December).
  const apiKey = process.env.TRAVEL_PLANNER_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        system: `You advise on the best time of year to do a bucket-list experience, given only its name.

- If it's tied to a holiday, festival, or season, reflect that PRECISELY. Examples: "Christmas in Vienna" -> the Christmas markets, late November to December; "cherry blossoms in Kyoto" -> late March to April; "Oktoberfest" -> late September to early October.
- Otherwise use the best-weather / shoulder season for the place implied by the name.
- If the name has no time-of-year signal at all (a generic activity with no place or season), return an empty bestMonths and empty idealSeasons.

Fields:
- bestMonths: a short human range using full English month names, e.g. "December", "Late November to December", "March to May". Empty string if unknown.
- idealSeasons: array drawn from ["spring","summer","autumn","winter"] matching bestMonths (northern-hemisphere seasons; adjust for southern-hemisphere places). Empty array if unknown.
- tip: one concise, practical sentence about timing. Never restate a dictionary/encyclopedia definition.

Respond with ONLY valid JSON: {"bestMonths":"...","idealSeasons":["..."],"tip":"..."}`,
        messages: [{ role: "user", content: String(name) }],
      });

      const text = message.content[0]?.type === "text" ? message.content[0].text : "";
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return NextResponse.json({
          bestMonths: parsed.bestMonths || null,
          idealSeasons: Array.isArray(parsed.idealSeasons) ? parsed.idealSeasons : [],
          tip: parsed.tip || "",
        });
      }
    } catch (err) {
      console.error("autofill Claude error:", err instanceof Error ? err.message : err);
    }
  }

  // 3) Nothing determinable — neutral defaults with NO specific months, so the
  //    strip stays empty and the user just taps the months that work for them.
  return NextResponse.json({
    tip: "Research the local climate and peak seasons for the best experience.",
  });
}
