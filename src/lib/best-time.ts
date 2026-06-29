// Timing helpers for the "Best time to go" feature.
// Pure functions — safe on both server and client.

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Localized short labels for the month strip
export const MONTH_LABELS: Record<string, string[]> = {
  en: MONTH_ABBR,
  zh: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
};

export type MonthRating = "ideal" | "shoulder" | "skip";

const SEASON_MONTHS: Record<string, number[]> = {
  spring: [2, 3, 4],
  summer: [5, 6, 7],
  autumn: [8, 9, 10],
  winter: [11, 0, 1],
};

const SEASON_ORDER = ["spring", "summer", "autumn", "winter"];

// Find month indices mentioned in a text segment, in order of appearance.
function findMonthsInSegment(seg: string): number[] {
  const hits: { m: number; pos: number }[] = [];
  for (let m = 0; m < 12; m++) {
    let pos = seg.indexOf(MONTHS[m].toLowerCase());
    if (pos === -1) pos = seg.indexOf(MONTH_ABBR[m].toLowerCase());
    if (pos !== -1) hits.push({ m, pos });
  }
  hits.sort((a, b) => a.pos - b.pos);
  return hits.map((h) => h.m);
}

// Inclusive month range that wraps around the year (e.g. Nov -> Apr).
function expandRange(a: number, b: number): number[] {
  const out: number[] = [];
  let i = a;
  for (let guard = 0; guard < 12; guard++) {
    out.push(i);
    if (i === b) break;
    i = (i + 1) % 12;
  }
  return out;
}

// Parse a "best months" string (e.g. "March–May or October–November") into
// the set of ideal month indices. Falls back to ideal seasons when no months
// can be parsed.
export function idealMonths(
  bestMonths?: string | null,
  idealSeasons?: string[],
): number[] {
  const ideal = new Set<number>();
  const text = (bestMonths || "").toLowerCase();

  if (text) {
    const segments = text.split(/\bor\b|,|&|\band\b/);
    for (const seg of segments) {
      const found = findMonthsInSegment(seg);
      if (found.length === 0) continue;
      const isRange =
        found.length >= 2 && /[–—-]|\bto\b|\bthrough\b|\buntil\b/.test(seg);
      if (isRange) {
        for (const m of expandRange(found[0], found[found.length - 1])) ideal.add(m);
      } else {
        for (const m of found) ideal.add(m);
      }
    }
  }

  if (ideal.size === 0 && idealSeasons) {
    for (const s of idealSeasons) {
      for (const m of SEASON_MONTHS[s] || []) ideal.add(m);
    }
  }

  return [...ideal].sort((a, b) => a - b);
}

// Rate all 12 months: ideal windows, the shoulder month on either side, or skip.
export function classifyMonths(
  bestMonths?: string | null,
  idealSeasons?: string[],
): MonthRating[] {
  const ideal = new Set(idealMonths(bestMonths, idealSeasons));
  const shoulder = new Set<number>();
  for (const m of ideal) {
    const prev = (m + 11) % 12;
    const next = (m + 1) % 12;
    if (!ideal.has(prev)) shoulder.add(prev);
    if (!ideal.has(next)) shoulder.add(next);
  }
  return Array.from({ length: 12 }, (_, m) =>
    ideal.has(m) ? "ideal" : shoulder.has(m) ? "shoulder" : "skip",
  );
}

// Map chosen month names back to the seasons they fall in (for matching/filtering).
export function monthsToSeasons(months: string[]): string[] {
  const set = new Set<string>();
  for (const name of months) {
    const idx = MONTHS.indexOf(name);
    if (idx === -1) continue;
    for (const [season, ms] of Object.entries(SEASON_MONTHS)) {
      if (ms.includes(idx)) set.add(season);
    }
  }
  return SEASON_ORDER.filter((s) => set.has(s));
}
