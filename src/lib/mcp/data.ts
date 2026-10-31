// Myra data for the /mcp door: the same tables and timing rules as the web
// app (src/lib/best-time.ts), shaped for Claude and the in-chat widget.

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { affinities, buddies, experiencePhotos, experiences } from "@/db/schema";
import { classifyMonths, MONTHS, type MonthRating } from "@/lib/best-time";

type Experience = typeof experiences.$inferSelect;
type PhotoRow = typeof experiencePhotos.$inferSelect;

export type Photo = {
  unsplashId: string;
  url: string;
  thumbUrl: string;
  altDescription: string | null;
  photographerName: string;
  photographerUrl: string;
};

export type Who = { name: string; emoji: string; tier: string };

export type Item = {
  id: number;
  name: string;
  status: string;
  place: string;
  city: string | null;
  country: string;
  description: string | null;
  locality: string;
  estimatedDays: number | null;
  estimatedBudget: string | null;
  doByAge: string | null;
  bestMonths: string | null;
  seasons: string[];
  partners: string[];
  planned: string[];
  months: MonthRating[];
  hasTiming: boolean;
  photo: Photo | null;
  who: Who[];
  url: string;
};

export type ItemResult = { kind: "item"; item: Item; photoOptions: Photo[]; note?: string };

export type BoardFilters = {
  month?: string;
  partner?: string;
  status?: "wishlist" | "visited" | "all";
  locality?: string;
  search?: string;
};

export type Board = {
  kind: "board";
  label: string;
  chips: string[];
  view: "cards" | "list" | "calendar";
  url: string;
  total: number;
  items: (Item & { fit: MonthRating | null })[];
  calendar: { month: string; chips: { id: number; name: string; rating: MonthRating; planned: boolean }[] }[];
};

const list = (v: string | null | undefined) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);

export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

const toPhoto = (p: PhotoRow): Photo => ({
  unsplashId: p.unsplashId,
  url: p.url,
  thumbUrl: p.thumbUrl,
  altDescription: p.altDescription,
  photographerName: p.photographerName,
  photographerUrl: p.photographerUrl,
});

function present(e: Experience, photo: Photo | null, who: Who[]): Item {
  const seasons = list(e.idealSeasons);
  const hasTiming = !!e.bestMonths || seasons.length > 0;
  return {
    id: e.id,
    name: e.name,
    status: e.status,
    place: [e.city, e.country].filter(Boolean).join(", "),
    city: e.city,
    country: e.country,
    description: e.description,
    locality: e.locality,
    estimatedDays: e.estimatedDays,
    estimatedBudget: e.estimatedBudget,
    doByAge: e.doByAge,
    bestMonths: e.bestMonths,
    seasons,
    partners: list(e.idealPartnerTypes),
    planned: list(e.plannedMonths),
    months: hasTiming ? classifyMonths(e.bestMonths, seasons) : Array(12).fill("skip"),
    hasTiming,
    photo,
    who,
    url: `${siteUrl()}/bucket-list/${e.id}`,
  };
}

/** Experiences with their cover photo (newest photo, as the web app shows) and friends' interest. */
export async function loadItems(userId: string, ids?: number[]): Promise<Item[]> {
  const where = ids
    ? and(eq(experiences.userId, userId), inArray(experiences.id, ids))
    : eq(experiences.userId, userId);
  const rows: Experience[] = await db.select().from(experiences).where(where).orderBy(desc(experiences.createdAt));
  if (rows.length === 0) return [];
  const expIds = rows.map((r) => r.id);

  const photos: PhotoRow[] = await db
    .select()
    .from(experiencePhotos)
    .where(inArray(experiencePhotos.experienceId, expIds))
    .orderBy(desc(experiencePhotos.id));
  const cover = new Map<number, Photo>();
  for (const p of photos) if (!cover.has(p.experienceId)) cover.set(p.experienceId, toPhoto(p));

  const marks: { experienceId: number; tier: string; name: string; emoji: string }[] = await db
    .select({ experienceId: affinities.experienceId, tier: affinities.tier, name: buddies.name, emoji: buddies.emoji })
    .from(affinities)
    .innerJoin(buddies, eq(affinities.buddyId, buddies.id))
    .where(and(eq(buddies.userId, userId), inArray(affinities.experienceId, expIds)));
  const order = ["take-me-there", "interested", "open"];
  const who = new Map<number, Who[]>();
  for (const m of marks) {
    const arr = who.get(m.experienceId) ?? [];
    arr.push({ name: m.name, emoji: m.emoji, tier: m.tier });
    who.set(m.experienceId, arr);
  }
  for (const arr of who.values()) arr.sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier));

  return rows.map((r) => present(r, cover.get(r.id) ?? null, who.get(r.id) ?? []));
}

export async function loadItem(userId: string, id: number) {
  return (await loadItems(userId, [id]))[0] ?? null;
}

// ── Board ────────────────────────────────────────────────────────────────

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function board(items: Item[], f: BoardFilters, view?: Board["view"]): Board {
  const status = f.status ?? "wishlist";
  const m = f.month ? MONTHS.findIndex((x) => x.toLowerCase() === f.month!.toLowerCase()) : -1;
  const q = f.search?.toLowerCase();

  let out = items
    .filter((i) => status === "all" || i.status === status)
    .filter((i) => !f.partner || i.partners.includes(f.partner))
    .filter((i) => !f.locality || i.locality === f.locality)
    .filter((i) => !q || `${i.name} ${i.place}`.toLowerCase().includes(q))
    .map((i) => ({ ...i, fit: m >= 0 ? i.months[m] : null }));
  if (m >= 0) {
    // A planned month counts as a fit even if the timing data says otherwise.
    out = out
      .map((i) => (i.planned.includes(MONTHS[m]) && i.fit === "skip" ? { ...i, fit: "shoulder" as MonthRating } : i))
      .filter((i) => i.fit !== "skip")
      .sort((a, b) => (a.fit === b.fit ? 0 : a.fit === "ideal" ? -1 : 1));
  }

  const calendar = MONTHS.map((month, idx) => ({
    month: month.slice(0, 3),
    chips: out
      .filter((i) => i.months[idx] !== "skip" || i.planned.includes(month))
      .map((i) => ({
        id: i.id,
        name: i.city || i.name,
        rating: i.months[idx] === "skip" ? ("shoulder" as MonthRating) : i.months[idx],
        planned: i.planned.includes(month),
      })),
  })).filter((c) => c.chips.length > 0);

  const chips = [
    m >= 0 ? MONTHS[m] : null,
    f.partner ? cap(f.partner) : null,
    f.locality ? cap(f.locality) : null,
    status === "all" ? "Everything" : cap(status),
  ].filter(Boolean) as string[];

  return {
    kind: "board",
    label: m >= 0 ? `Ideas for ${MONTHS[m]}` : status === "visited" ? "Places you've been" : "Bucket list",
    chips,
    view: view ?? (m >= 0 ? "cards" : "list"),
    url: `${siteUrl()}/bucket-list`,
    total: items.length,
    items: out,
    calendar,
  };
}

// ── Text for the model (the widget isn't shown on every host) ─────────────

const rated = (i: Item) => {
  const ideal = MONTHS.filter((_, k) => i.months[k] === "ideal").map((x) => x.slice(0, 3));
  return ideal.length ? `best ${ideal.join(", ")}` : "no timing yet";
};

export function itemText(i: Item) {
  const bits = [
    `#${i.id} ${i.name}`,
    i.place || null,
    i.status,
    i.hasTiming ? rated(i) : "no timing yet",
    i.planned.length ? `planned ${i.planned.join(", ")}` : null,
    i.partners.length ? `with ${i.partners.join("/")}` : null,
    i.estimatedDays ? `~${i.estimatedDays} days` : null,
    i.doByAge ? `do by ${i.doByAge}` : null,
    i.who.length ? `friends: ${i.who.map((w) => `${w.name} (${w.tier})`).join(", ")}` : null,
  ];
  return bits.filter(Boolean).join(" · ");
}

export function boardText(b: Board) {
  if (b.items.length === 0) return `${b.label} (${b.chips.join(", ")}): nothing matches. ${b.total} items in total.`;
  return [
    `${b.label} (${b.chips.join(", ")}): ${b.items.length} of ${b.total}.`,
    ...b.items.map((i) => `- ${itemText(i)}${i.fit ? ` · ${i.fit} that month` : ""}`),
  ].join("\n");
}

// ── Photos (Unsplash, same API as /api/photos/search) ──────────────────────

export async function searchPhotos(query: string, count = 3): Promise<Photo[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || !query.trim()) return [];
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []).map(
      (p: {
        id: string;
        urls: { regular: string; thumb: string };
        alt_description: string | null;
        user: { name: string; links: { html: string } };
      }) => ({
        unsplashId: p.id,
        url: p.urls.regular,
        thumbUrl: p.urls.thumb,
        altDescription: p.alt_description,
        photographerName: p.user.name,
        photographerUrl: p.user.links.html,
      })
    );
  } catch {
    return [];
  }
}

/** Saves a photo as the item's cover (the newest photo is the cover, as in the web app). */
export async function setCover(userId: string, id: number, photo: Photo) {
  const owned = await db
    .select({ id: experiences.id })
    .from(experiences)
    .where(and(eq(experiences.id, id), eq(experiences.userId, userId)));
  if (owned.length === 0) return false;
  await db.insert(experiencePhotos).values({ experienceId: id, ...photo });
  return true;
}
