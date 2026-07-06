import { db } from "@/db";
import { experiences } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getUser, unauthorized } from "@/lib/get-user";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const result = await db
    .select()
    .from(experiences)
    .where(and(eq(experiences.id, parseInt(id)), eq(experiences.userId, user.id!)));

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(result[0]);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const result = await db
    .update(experiences)
    .set({
      name: body.name,
      description: body.description ?? null,
      city: body.city ?? null,
      country: body.country ?? "",
      idealSeasons: body.idealSeasons ?? "",
      idealPartnerTypes: body.idealPartnerTypes ?? "",
      plannedMonths: body.plannedMonths ?? "",
      locality: body.locality ?? "",
      estimatedDays: body.estimatedDays ?? null,
      bestMonths: body.bestMonths ?? null,
      estimatedBudget: body.estimatedBudget ?? null,
      doByAge: body.doByAge ?? null,
      status: body.status ?? "wishlist",
    })
    .where(and(eq(experiences.id, parseInt(id)), eq(experiences.userId, user.id!)))
    .returning();

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(result[0]);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  await db.delete(experiences).where(
    and(eq(experiences.id, parseInt(id)), eq(experiences.userId, user.id!))
  );
  return NextResponse.json({ success: true });
}
