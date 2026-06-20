import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { experiences } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/get-user";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const apiKey = process.env.TRAVEL_PLANNER_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 }
    );
  }
  const client = new Anthropic({ apiKey });
  const body = await request.json();
  const { prompt, month, days, companion, ageRange, budget, lang, previousNames } = body;

  // Fetch the user's bucket list
  const wishlist = await db
    .select()
    .from(experiences)
    .where(and(eq(experiences.status, "wishlist"), eq(experiences.userId, user.id!)));

  const bucketListContext =
    wishlist.length > 0
      ? wishlist
          .map(
            (e: any) =>
              `- "${e.name}" (${e.country || "no country"}${
                e.idealSeasons ? `, best in: ${e.idealSeasons}` : ""
              }${e.idealPartnerTypes ? `, ideal for: ${e.idealPartnerTypes}` : ""}${
                e.doByAge ? `, do by age: ${e.doByAge}` : ""
              })`
          )
          .join("\n")
      : "No items in bucket list yet.";

  const systemPrompt = `You are a thoughtful travel advisor. The user is planning a trip and wants destination/experience recommendations.

Here is the user's existing bucket list (PRIORITIZE matching items from this list first, then suggest new ideas):
${bucketListContext}

Respond with a JSON object in this exact format:
{
  "recommendations": [
    {
      "name": "Experience or destination name",
      "country": "Country",
      "description": "A compelling 1-2 sentence description of why this matches their intent",
      "bestMonths": "e.g. March-May",
      "estimatedDays": 5,
      "estimatedBudget": "$1500-2500",
      "fromBucketList": true,
      "matchReason": "Brief reason why this matches their request"
    }
  ],
  "travelInsight": "A brief, warm 1-2 sentence personal insight about their travel intent"
}

Rules:
- Return 4-6 recommendations
- Put bucket list matches FIRST (set fromBucketList: true)
- Then add 2-3 NEW ideas not in their bucket list (set fromBucketList: false)
- Be specific and practical with budget estimates
- Match the energy/vibe of their prompt
- Keep descriptions concise but evocative
- ONLY return valid JSON, no markdown or extra text
- IMPORTANT: Respond in ${lang === "zh" ? "Chinese (简体中文)" : "English"}. All text fields (name, description, matchReason, travelInsight) must be in ${lang === "zh" ? "Chinese" : "English"}. Keep country names, month names, and budget in English/international format.${previousNames?.length ? `\n- DO NOT recommend any of these already-shown experiences: ${previousNames.join(", ")}. Suggest completely different destinations.` : ""}`;

  const userMessage = [
    prompt ? `My travel intent: "${prompt}"` : "",
    month ? `Travel month: ${month}` : "",
    days ? `Days available: ${days}` : "",
    companion ? `Traveling with: ${companion}` : "",
    ageRange ? `My age range: ${ageRange}` : "",
    budget ? `Budget: ${budget}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: userMessage }],
      system: systemPrompt,
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse recommendations" },
        { status: 500 }
      );
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Discover API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
