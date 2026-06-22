import { db } from "@/db";
import { buddies } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getUser, unauthorized } from "@/lib/get-user";

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();

  const results = await db
    .select()
    .from(buddies)
    .where(eq(buddies.userId, user.id!))
    .orderBy(asc(buddies.createdAt));

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const body = await request.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const result = await db
    .insert(buddies)
    .values({ userId: user.id!, name: body.name.trim(), emoji: body.emoji?.trim() || "🌍" })
    .returning();

  return NextResponse.json(result[0], { status: 201 });
}
