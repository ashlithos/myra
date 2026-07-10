"use client";

import { useState, useRef } from "react";
import type { Experience, AffinityTier } from "@/lib/types";

type Prototype = "B" | "A" | "C";

const TIERS: AffinityTier[] = ["take-me-there", "interested", "open"];
const TIER_LABEL: Record<AffinityTier, string> = {
  "take-me-there": "Take me there",
  interested: "Interested",
  open: "I'm open",
};

// ── Prototype B: 3-tier tap ────────────────────────────────────────────────
function HeartRating({
  experiences,
  initial,
  onChange,
}: {
  experiences: Experience[];
  initial: Record<number, AffinityTier>;
  onChange: (ratings: Record<number, AffinityTier>) => void;
}) {
  const [ratings, setRatings] = useState<Record<number, AffinityTier>>(initial);

  function pick(expId: number, tier: AffinityTier) {
    const next = { ...ratings, [expId]: tier };
    setRatings(next);
    onChange(next);
  }

  return (
    <div className="space-y-1">
      {experiences.map((exp) => (
        <div
          key={exp.id}
          className="border-t border-[#D4D0C8] py-4 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="flex-1 min-w-0">
            <div className="font-serif text-base">{exp.name}</div>
            {exp.country && (
              <div className="text-xs text-[#1A1A1A]/60 mt-0.5">{exp.country}</div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {TIERS.map((tier) => (
              <button
                key={tier}
                onClick={() => pick(exp.id, tier)}
                className={`text-xs px-3 py-1.5 min-h-[44px] inline-flex items-center border transition-all ${
                  ratings[exp.id] === tier
                    ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                    : "border-[#D4D0C8] text-[#1A1A1A]/70 hover:border-[#1A1A1A]/40 hover:text-[#1A1A1A]"
                }`}
              >
                {TIER_LABEL[tier]}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Prototype A: drag to reorder ───────────────────────────────────────────
function DragRank({
  experiences,
  onChange,
}: {
  experiences: Experience[];
  onChange: (ratings: Record<number, AffinityTier>) => void;
}) {
  const [order, setOrder] = useState<Experience[]>(experiences);
  const dragIdx = useRef<number | null>(null);

  function rankedToTiers(ordered: Experience[]): Record<number, AffinityTier> {
    const n = ordered.length;
    const result: Record<number, AffinityTier> = {};
    ordered.forEach((exp, i) => {
      if (i < Math.ceil(n / 3)) result[exp.id] = "take-me-there";
      else if (i < Math.ceil((2 * n) / 3)) result[exp.id] = "interested";
      else result[exp.id] = "open";
    });
    return result;
  }

  function onDragStart(i: number) {
    dragIdx.current = i;
  }

  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const next = [...order];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    dragIdx.current = i;
    setOrder(next);
    onChange(rankedToTiers(next));
  }

  const n = order.length;
  const topCount = Math.ceil(n / 3);
  const midCount = Math.ceil((2 * n) / 3) - topCount;

  function bandLabel(i: number): string | null {
    if (i === 0) return TIER_LABEL["take-me-there"];
    if (i === topCount) return TIER_LABEL["interested"];
    if (i === topCount + midCount) return TIER_LABEL["open"];
    return null;
  }

  return (
    <div className="space-y-0.5">
      <p className="text-xs text-[#1A1A1A]/60 mb-4">
        Drag rows into your preference order. Top third = &ldquo;Take me there&rdquo;, middle = &ldquo;Interested&rdquo;, bottom = &ldquo;I&apos;m open&rdquo;.
      </p>
      {order.map((exp, i) => (
        <div key={exp.id}>
          {bandLabel(i) && (
            <div className="text-[10px] tracking-[0.15em] uppercase text-[#1A1A1A]/60 pt-4 pb-1">
              {bandLabel(i)}
            </div>
          )}
          <div
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={(e) => onDragOver(e, i)}
            className="flex items-center gap-3 border border-[#D4D0C8] bg-white px-3 py-3 cursor-grab active:cursor-grabbing select-none hover:border-[#1A1A1A]/30 transition-colors"
          >
            <span className="text-[#1A1A1A]/45 text-sm">⠿</span>
            <span className="text-xs font-mono text-[#1A1A1A]/60 w-5">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="font-serif text-base">{exp.name}</div>
              {exp.country && (
                <div className="text-xs text-[#1A1A1A]/60">{exp.country}</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Prototype C: this-or-that ──────────────────────────────────────────────
function ThisOrThat({
  experiences,
  onChange,
}: {
  experiences: Experience[];
  onChange: (ratings: Record<number, AffinityTier>) => void;
}) {
  // Generate a capped set of pairs (max 10 matchups for usability)
  const pairs = (() => {
    const all: [Experience, Experience][] = [];
    for (let i = 0; i < experiences.length; i++) {
      for (let j = i + 1; j < experiences.length; j++) {
        all.push([experiences[i], experiences[j]]);
      }
    }
    // Shuffle and cap at 10
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, Math.min(10, all.length));
  })();

  const [step, setStep] = useState(0);
  const [wins, setWins] = useState<Record<number, number>>({});
  const [done, setDone] = useState(false);

  function pick(winner: Experience) {
    const next = { ...wins, [winner.id]: (wins[winner.id] ?? 0) + 1 };
    setWins(next);
    if (step + 1 >= pairs.length) {
      setDone(true);
      onChange(winsToTiers(next));
    } else {
      setStep(step + 1);
    }
  }

  function winsToTiers(w: Record<number, number>): Record<number, AffinityTier> {
    const sorted = [...experiences].sort(
      (a, b) => (w[b.id] ?? 0) - (w[a.id] ?? 0)
    );
    const n = sorted.length;
    const result: Record<number, AffinityTier> = {};
    sorted.forEach((exp, i) => {
      if (i < Math.ceil(n / 3)) result[exp.id] = "take-me-there";
      else if (i < Math.ceil((2 * n) / 3)) result[exp.id] = "interested";
      else result[exp.id] = "open";
    });
    return result;
  }

  if (experiences.length < 2) {
    return <p className="text-sm text-[#1A1A1A]/60 py-8">Need at least 2 destinations for this mode.</p>;
  }

  if (done) {
    const tiers = winsToTiers(wins);
    const byTier = (t: AffinityTier) =>
      experiences.filter((e) => tiers[e.id] === t);
    return (
      <div>
        <p className="text-sm text-[#1A1A1A]/70 mb-6">All done — here&apos;s what we inferred from your picks:</p>
        {TIERS.map((tier) => (
          <div key={tier} className="mb-4">
            <div className="text-[10px] tracking-[0.15em] uppercase text-[#1A1A1A]/60 mb-2">
              {TIER_LABEL[tier]}
            </div>
            {byTier(tier).map((exp) => (
              <div key={exp.id} className="border-t border-[#D4D0C8] py-3 font-serif">
                {exp.name}
                {exp.country && <span className="text-sm text-[#1A1A1A]/60 ml-2">{exp.country}</span>}
              </div>
            ))}
          </div>
        ))}
        <button
          onClick={() => { setStep(0); setWins({}); setDone(false); }}
          className="mt-4 inline-flex items-center min-h-[44px] text-xs tracking-[0.15em] uppercase text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors underline underline-offset-2"
        >
          Redo
        </button>
      </div>
    );
  }

  const [left, right] = pairs[step];
  const progress = Math.round((step / pairs.length) * 100);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-[#D4D0C8]">
          <div
            className="h-px bg-[#1A1A1A] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-[#1A1A1A]/60 shrink-0">
          {step + 1} / {pairs.length}
        </span>
      </div>
      <p className="text-sm text-[#1A1A1A]/70 mb-6 text-center">Which would you rather visit?</p>
      <div className="grid grid-cols-2 gap-3">
        {[left, right].map((exp) => (
          <button
            key={exp.id}
            onClick={() => pick(exp)}
            className="border border-[#D4D0C8] p-6 text-left hover:border-[#1A1A1A] hover:shadow-sm transition-all group"
          >
            <div className="font-serif text-lg group-hover:text-[#1A1A1A] text-[#1A1A1A]/80">
              {exp.name}
            </div>
            {exp.country && (
              <div className="text-xs text-[#1A1A1A]/60 mt-1">{exp.country}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Shell with prototype toggle ────────────────────────────────────────────
export default function RankPrototype({
  experiences,
  buddyId,
  ownerUserId,
  existingRatings,
}: {
  experiences: Experience[];
  buddyId: number;
  ownerUserId: string;
  existingRatings: Record<number, AffinityTier>;
}) {
  const [mode, setMode] = useState<Prototype>("B");
  const [ratings, setRatings] = useState<Record<number, AffinityTier>>(existingRatings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit() {
    setSaving(true);
    const payload = Object.entries(ratings).map(([expId, tier]) => ({
      experienceId: parseInt(expId),
      tier,
    }));
    await fetch("/api/affinities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buddyId, ownerUserId, ratings: payload }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const tabs: { id: Prototype; label: string }[] = [
    { id: "B", label: "B · Tap a tier" },
    { id: "A", label: "A · Drag to rank" },
    { id: "C", label: "C · This or That" },
  ];

  const ratedCount = Object.keys(ratings).length;

  return (
    <div>
      {/* Prototype toggle */}
      <div className="flex gap-0 mb-8 border border-[#D4D0C8]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`flex-1 py-2 min-h-[44px] inline-flex items-center justify-center text-xs tracking-[0.1em] uppercase transition-colors border-r border-[#D4D0C8] last:border-r-0 ${
              mode === tab.id
                ? "bg-[#1A1A1A] text-white"
                : "text-[#1A1A1A]/70 hover:text-[#1A1A1A] hover:bg-[#F3F0EB]"
            }`}
          >
            {tab.label}
            {tab.id === "B" && (
              <span className="ml-1 text-[9px] opacity-60">✓ chosen</span>
            )}
          </button>
        ))}
      </div>

      {mode === "B" && (
        <HeartRating
          experiences={experiences}
          initial={ratings}
          onChange={setRatings}
        />
      )}
      {mode === "A" && (
        <DragRank experiences={experiences} onChange={(r) => setRatings((prev) => ({ ...prev, ...r }))} />
      )}
      {mode === "C" && (
        <ThisOrThat experiences={experiences} onChange={(r) => setRatings((prev) => ({ ...prev, ...r }))} />
      )}

      {/* Submit */}
      <div className="mt-8 flex items-center gap-4 border-t border-[#D4D0C8] pt-6">
        <button
          onClick={submit}
          disabled={saving || ratedCount === 0}
          className="px-6 py-2.5 min-h-[44px] inline-flex items-center justify-center border border-[#1A1A1A] bg-[#1A1A1A] text-white text-xs tracking-[0.15em] uppercase hover:bg-[#1A1A1A]/80 transition-colors disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save my picks"}
        </button>
        {ratedCount > 0 && (
          <span className="text-xs text-[#1A1A1A]/60">
            {ratedCount} of {experiences.length} rated
          </span>
        )}
        {saved && (
          <span className="text-xs text-[#1A1A1A]/70">Saved ✓</span>
        )}
      </div>
    </div>
  );
}
