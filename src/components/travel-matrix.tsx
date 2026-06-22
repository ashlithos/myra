"use client";

import { useState } from "react";
import type { Experience, Buddy, Affinity, AffinityTier } from "@/lib/types";

const TIER_LABEL: Record<AffinityTier, string> = {
  "take-me-there": "Take me there",
  interested: "Interested",
  open: "I'm open",
};

const TIER_COLOR: Record<AffinityTier, string> = {
  "take-me-there": "bg-[#1A1A1A] text-white",
  interested: "bg-[#D4D0C8] text-[#1A1A1A]",
  open: "bg-[#F3F0EB] text-[#1A1A1A]/60",
};

export default function TravelMatrix({
  experiences,
  buddies,
  affinities,
}: {
  experiences: Experience[];
  buddies: Buddy[];
  affinities: Affinity[];
}) {
  const [filter, setFilter] = useState<"all" | AffinityTier>("all");

  function getTier(buddyId: number, expId: number): AffinityTier | null {
    return (
      (affinities.find(
        (a) => a.buddyId === buddyId && a.experienceId === expId
      )?.tier as AffinityTier) ?? null
    );
  }

  function overlapCount(expId: number): number {
    return buddies.filter((b) => {
      const t = getTier(b.id, expId);
      return t === "take-me-there" || t === "interested";
    }).length;
  }

  const filtered =
    filter === "all"
      ? experiences
      : experiences.filter((exp) =>
          buddies.some((b) => getTier(b.id, exp.id) === filter)
        );

  if (buddies.length === 0) {
    return (
      <p className="text-sm text-[#1A1A1A]/40 py-8">
        Add buddies on the left to see the matrix.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-[10px] tracking-[0.2em] uppercase text-[#1A1A1A]/50">
          Overlap Map
        </h2>
        <div className="flex gap-1 ml-auto">
          {(["all", "take-me-there", "interested", "open"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[10px] tracking-[0.1em] uppercase px-2.5 py-1 border transition-colors ${
                filter === f
                  ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                  : "border-[#D4D0C8] text-[#1A1A1A]/50 hover:border-[#1A1A1A]/40"
              }`}
            >
              {f === "all" ? "All" : TIER_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 pr-4 text-[10px] tracking-[0.15em] uppercase text-[#1A1A1A]/40 font-normal w-48">
                Destination
              </th>
              {buddies.map((b) => (
                <th
                  key={b.id}
                  className="text-[10px] tracking-[0.1em] uppercase text-[#1A1A1A]/40 font-normal px-2 pb-2 min-w-[120px]"
                >
                  {b.name}
                </th>
              ))}
              <th className="text-[10px] tracking-[0.1em] uppercase text-[#1A1A1A]/40 font-normal px-3 pb-2 text-right">
                Overlap
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={buddies.length + 2}
                  className="py-8 text-center text-sm text-[#1A1A1A]/40"
                >
                  No destinations match this filter yet.
                </td>
              </tr>
            )}
            {filtered.map((exp) => {
              const overlap = overlapCount(exp.id);
              return (
                <tr key={exp.id} className="border-t border-[#D4D0C8]">
                  <td className="py-3 pr-4">
                    <div className="font-serif">{exp.name}</div>
                    {exp.country && (
                      <div className="text-xs text-[#1A1A1A]/40">{exp.country}</div>
                    )}
                  </td>
                  {buddies.map((b) => {
                    const tier = getTier(b.id, exp.id);
                    return (
                      <td key={b.id} className="px-2 py-3 text-center">
                        {tier ? (
                          <span
                            className={`inline-block text-[10px] px-2 py-0.5 ${TIER_COLOR[tier]}`}
                          >
                            {TIER_LABEL[tier]}
                          </span>
                        ) : (
                          <span className="text-[#1A1A1A]/20 text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-right">
                    {overlap > 0 ? (
                      <span className="text-xs font-mono text-[#1A1A1A]">
                        {overlap}/{buddies.length}
                      </span>
                    ) : (
                      <span className="text-[#1A1A1A]/20 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
