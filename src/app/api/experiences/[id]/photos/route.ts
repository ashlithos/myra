import { db } from "@/db";
import { experiencePhotos } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const photos = await db
    .select()
    .from(experiencePhotos)
    .where(eq(experiencePhotos.experienceId, parseInt(id)))
    .orderBy(desc(experiencePhotos.id));

  return NextResponse.json(photos);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const result = await db
    .insert(experiencePhotos)
    .values({
      experienceId: parseInt(id),
      unsplashId: body.unsplashId,
      url: body.url,
      thumbUrl: body.thumbUrl,
      altDescription: body.altDescription || null,
      photographerName: body.photographerName,
      photographerUrl: body.photographerUrl,
    })
    .returning();

  return NextResponse.json(result[0], { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const photoId = request.nextUrl.searchParams.get("photoId");

  if (photoId) {
    await db
      .delete(experiencePhotos)
      .where(eq(experiencePhotos.id, parseInt(photoId)));
  }

  return NextResponse.json({ ok: true });
}
