import { db } from "@/db";
import { experiences } from "@/db/schema";
import { like, eq, and, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getUser, unauthorized } from "@/lib/get-user";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const season = searchParams.get("season");
  const partnerType = searchParams.get("partnerType");
  const maxDays = searchParams.get("maxDays");

  const conditions = [eq(experiences.userId, user.id!)];
  if (status) conditions.push(eq(experiences.status, status));
  if (season) conditions.push(like(experiences.idealSeasons, `%${season}%`));
  if (partnerType)
    conditions.push(like(experiences.idealPartnerTypes, `%${partnerType}%`));
  if (maxDays)
    conditions.push(
      sql`${experiences.estimatedDays} <= ${parseInt(maxDays)} OR ${experiences.estimatedDays} IS NULL`
    );

  const results = await db
    .select()
    .from(experiences)
    .where(and(...conditions));

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const result = await db
    .insert(experiences)
    .values({
      userId: user.id!,
      name: body.name,
      description: body.description || null,
      city: body.city || null,
      country: body.country || "",
      idealSeasons: body.idealSeasons || "",
      idealPartnerTypes: body.idealPartnerTypes || "",
      plannedMonths: body.plannedMonths || "",
      estimatedDays: body.estimatedDays || null,
      bestMonths: body.bestMonths || null,
      estimatedBudget: body.estimatedBudget || null,
      doByAge: body.doByAge || null,
      status: body.status || "wishlist",
    })
    .returning();

  return NextResponse.json(result[0], { status: 201 });
}
