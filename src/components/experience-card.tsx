"use client";

import Link from "next/link";
import { formatIndex, parseCommaSeparated } from "@/lib/utils";
import type { Experience } from "@/lib/types";
import CardMenu from "./card-menu";
import CardMeta from "./card-meta";
import { useI18n } from "@/lib/i18n";

export default function ExperienceCard({
  experience,
  index,
}: {
  experience: Experience;
  index: number;
}) {
  const { t } = useI18n();
  const seasons = parseCommaSeparated(experience.idealSeasons);
  const partnerTypes = parseCommaSeparated(experience.idealPartnerTypes);

  return (
    <div className="relative group border-t border-[#D4D0C8]">
      <Link href={`/bucket-list/${experience.id}`} className="block">
        <div className="py-5 flex items-start justify-between gap-4 pr-12">
          <div className="flex gap-4 items-start flex-1 min-w-0">
            <span className="text-xs text-[#1A1A1A]/60 font-mono pt-0.5">
              {formatIndex(index + 1)}
            </span>
            <div className="min-w-0">
              <h3 className="font-serif text-lg group-hover:text-[#1A1A1A]/70 transition-colors">
                {experience.name}
              </h3>
              <div className="text-[13px] text-[#1A1A1A]/70 mt-1 flex items-center gap-1.5 flex-wrap">
                <CardMeta experience={experience} />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {seasons.map((s) => (
                  <span
                    key={s}
                    className="text-[10px] tracking-[0.15em] uppercase text-[#1A1A1A]/70"
                  >
                    {t(`season.${s}` as any) || s}
                  </span>
                ))}
                {partnerTypes.length > 0 && seasons.length > 0 && (
                  <span className="text-[10px] text-[#1A1A1A]/40">·</span>
                )}
                {partnerTypes.map((p) => (
                  <span
                    key={p}
                    className="text-[10px] tracking-[0.15em] uppercase text-[#1A1A1A]/70"
                  >
                    {t(`partner.${p}` as any) || p}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {experience.doByAge && (
            <span className="text-[10px] tracking-[0.1em] uppercase text-[#1A1A1A]/60 border border-[#D4D0C8] px-2 py-0.5 shrink-0">
              {experience.doByAge === "60+" ? "60+" : `< ${experience.doByAge}`}
            </span>
          )}
        </div>
      </Link>
      <div className="absolute right-0 top-3.5">
        <CardMenu experienceId={experience.id} />
      </div>
    </div>
  );
}
