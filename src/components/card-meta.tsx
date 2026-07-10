"use client";

import { Home, Plane, MapPin, CalendarDays } from "lucide-react";
import type { Experience } from "@/lib/types";
import { parseCommaSeparated } from "@/lib/utils";
import { MONTHS, MONTH_ABBR, MONTH_LABELS } from "@/lib/best-time";
import { useI18n } from "@/lib/i18n";

// "April,May" -> "Apr +1" (localized, calendar-ordered)
function shortMonths(plannedMonths: string, lang: string): string {
  const set = parseCommaSeparated(plannedMonths);
  if (set.length === 0) return "";
  const labels = (MONTH_LABELS as Record<string, string[]>)[lang] ?? MONTH_ABBR;
  const ordered = MONTHS.filter((m) => set.includes(m));
  const first = labels[MONTHS.indexOf(ordered[0])];
  return ordered.length > 1 ? `${first} +${ordered.length - 1}` : first;
}

// Quiet caption line: [locality-tinted icon] Location · [cal] Month.
// Returns null when there's nothing to show, so callers can keep a fixed-height slot.
export default function CardMeta({ experience }: { experience: Experience }) {
  const { lang } = useI18n();
  const location = experience.city || experience.country || "";
  const months = shortMonths(experience.plannedMonths, lang);
  if (!location && !months) return null;

  const loc = experience.locality;
  const LocIcon = loc === "local" ? Home : loc === "travel" ? Plane : MapPin;
  const iconTint =
    loc === "local" ? "text-[#4F6350]" : loc === "travel" ? "text-[#8A5F43]" : "text-[#1A1A1A]/40";

  return (
    <>
      {location && (
        <span className="inline-flex items-center gap-1 min-w-0">
          <LocIcon size={12} className={`shrink-0 ${iconTint}`} strokeWidth={1.8} />
          <span className="truncate">{location}</span>
        </span>
      )}
      {location && months && <span className="opacity-40">·</span>}
      {months && (
        <span className="inline-flex items-center gap-1 shrink-0">
          <CalendarDays size={11} className="opacity-70" strokeWidth={1.8} />
          {months}
        </span>
      )}
    </>
  );
}
