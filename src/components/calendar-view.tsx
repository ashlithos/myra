"use client";

import { useState } from "react";
import Link from "next/link";
import { Home, Plane } from "lucide-react";
import type { Experience } from "@/lib/types";
import { parseCommaSeparated } from "@/lib/utils";
import { MONTHS, MONTH_ABBR, MONTH_LABELS } from "@/lib/best-time";
import { useI18n } from "@/lib/i18n";

type LocalityFilter = "all" | "local" | "travel";

// Current month index (0–11) in the user's PT timezone. Works on both
// server render and client so there's no hydration mismatch.
function currentMonthIndexPT(): number {
  const m = new Date().toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "numeric",
  });
  return parseInt(m, 10) - 1;
}

export default function CalendarView({ experiences }: { experiences: Experience[] }) {
  const { t, lang } = useI18n();
  const currentMonth = currentMonthIndexPT();
  const [filter, setFilter] = useState<LocalityFilter>("all");
  // Auto-open the current month on load.
  const [selected, setSelected] = useState<number | null>(currentMonth);

  const cellLabels = MONTH_LABELS[lang] ?? MONTH_ABBR;
  const monthFull = (i: number) => (lang === "zh" ? MONTH_LABELS.zh[i] : MONTHS[i]);

  // Universe: exclude visited, and only experiences that have month(s) set.
  // Then apply the Local/Travel filter (unset is excluded from local/travel).
  const byMonth: Experience[][] = Array.from({ length: 12 }, () => []);
  for (const exp of experiences) {
    if (exp.status === "visited") continue;
    if (filter !== "all" && exp.locality !== filter) continue;
    const months = parseCommaSeparated(exp.plannedMonths);
    for (const m of months) {
      const idx = MONTHS.indexOf(m);
      if (idx >= 0) byMonth[idx].push(exp);
    }
  }
  const counts = byMonth.map((list) => list.length);

  const filters: { value: LocalityFilter; label: string }[] = [
    { value: "all", label: t("calendar.all") },
    { value: "local", label: t("locality.local") },
    { value: "travel", label: t("locality.travel") },
  ];

  return (
    <div>
      {/* Local / Travel filter */}
      <div className="flex border border-[#D4D0C8] w-full sm:w-fit mb-6" role="group" aria-label="Local or travel">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center min-h-[44px] px-5 sm:px-6 text-[11px] md:text-[10px] tracking-[0.15em] uppercase transition-colors ${
              filter === f.value
                ? "bg-[#1A1A1A] text-white"
                : "text-[#1A1A1A]/70 hover:text-[#1A1A1A]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 12-month grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-2.5">
        {MONTHS.map((month, i) => {
          const count = counts[i];
          const isSelected = selected === i;
          const isCurrent = i === currentMonth;
          return (
            <button
              key={month}
              type="button"
              onClick={() => setSelected(isSelected ? null : i)}
              aria-expanded={isSelected}
              aria-label={`${monthFull(i)}, ${count} ${t("calendar.count")}`}
              className={`min-h-[64px] p-3.5 flex flex-col justify-between text-left border bg-white transition-shadow ${
                count === 0 ? "border-dashed border-[#D4D0C8] bg-transparent" : "border-[#D4D0C8]"
              } ${
                isSelected
                  ? "shadow-[inset_0_0_0_2px_#1A1A1A]"
                  : isCurrent
                  ? "shadow-[inset_0_0_0_2px_#EBCFBE]"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`font-serif text-lg ${count === 0 ? "text-[#1A1A1A]/40" : ""}`}>
                  {cellLabels[i]}
                </span>
                <span
                  className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-medium ${
                    count === 0
                      ? "bg-[#D4D0C8]/30 text-[#1A1A1A]/40"
                      : "bg-[#EBCFBE] text-[#1A1A1A]"
                  }`}
                >
                  {count}
                </span>
              </div>
              {isCurrent && (
                <span className="text-[10px] text-[#1A1A1A]/50 mt-1.5">{t("calendar.thisMonth")}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected month → experiences, expand-in-place */}
      {selected !== null && (
        <div className="border border-[#1A1A1A] bg-white p-5 md:p-6 mt-3">
          <h3 className="font-serif text-2xl">{monthFull(selected)}</h3>
          <p className="text-[11px] tracking-[0.1em] uppercase text-[#1A1A1A]/50 mb-1">
            {selected === currentMonth ? `${t("calendar.thisMonth")} · ` : ""}
            {counts[selected]} {t("calendar.count")} · {t("calendar.tapCollapse")}
          </p>

          {byMonth[selected].length === 0 ? (
            <div className="text-center py-8">
              <p className="font-serif italic text-[#1A1A1A]/55 mb-4">{t("calendar.emptyLine")}</p>
              <Link
                href={`/bucket-list/new?month=${encodeURIComponent(MONTHS[selected])}`}
                className="inline-flex items-center justify-center min-h-[44px] px-4 text-[11px] tracking-[0.12em] uppercase text-[#1A1A1A]/70 hover:text-[#1A1A1A] border border-[#D4D0C8] hover:border-[#1A1A1A]/40 transition-colors"
              >
                + {t("calendar.addFor")} {monthFull(selected)}
              </Link>
            </div>
          ) : (
            <div>
              {byMonth[selected].map((exp) => (
                <Link
                  key={exp.id}
                  href={`/bucket-list/${exp.id}`}
                  className="flex items-center justify-between gap-3 py-4 border-t border-[#D4D0C8] group"
                >
                  <span className="font-serif text-lg group-hover:text-[#1A1A1A]/70 transition-colors">
                    {exp.name}
                  </span>
                  <LocalityPill locality={exp.locality} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LocalityPill({ locality }: { locality: string }) {
  const { t } = useI18n();
  if (locality === "local") {
    return (
      <span className="inline-flex items-center gap-1.5 shrink-0 text-[10px] tracking-[0.07em] uppercase px-2.5 py-1.5 rounded-[3px] bg-[#7D907C]/20 text-[#4F6350]">
        <Home size={12} />
        {t("locality.local")}
      </span>
    );
  }
  if (locality === "travel") {
    return (
      <span className="inline-flex items-center gap-1.5 shrink-0 text-[10px] tracking-[0.07em] uppercase px-2.5 py-1.5 rounded-[3px] bg-[#EBCFBE]/60 text-[#8A5F43]">
        <Plane size={12} />
        {t("locality.travel")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 shrink-0 text-[10px] tracking-[0.07em] uppercase px-2.5 py-1.5 rounded-[3px] border border-dashed border-[#D4D0C8] text-[#1A1A1A]/45">
      {t("locality.setPrompt")}
    </span>
  );
}
