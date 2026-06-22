import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en`,
      { next: { revalidate: 60 } }
    );
    const data = await res.json();

    const suggestions: string[] = [];
    for (const feature of data.features ?? []) {
      const p = feature.properties;
      if (!p?.name) continue;
      const label = p.country ? `${p.name}, ${p.country}` : p.name;
      if (!suggestions.includes(label)) suggestions.push(label);
      if (suggestions.length >= 5) break;
    }

    return NextResponse.json(suggestions);
  } catch {
    return NextResponse.json([]);
  }
}
