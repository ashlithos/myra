"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Experience, Buddy, Affinity, AffinityTier } from "@/lib/types";
import RankPrototype from "@/components/rank-prototype";

type Step = "loading" | "pick-name" | "rank" | "done";

export default function RankPage() {
  const { userId } = useParams<{ userId: string }>();
  const [step, setStep] = useState<Step>("loading");
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [allAffinities, setAllAffinities] = useState<Affinity[]>([]);
  const [selectedBuddy, setSelectedBuddy] = useState<Buddy | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/travel/public/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setExperiences(data.experiences ?? []);
        setBuddies(data.buddies ?? []);
        setAllAffinities(data.affinities ?? []);
        setStep("pick-name");
      })
      .catch(() => setError("Couldn't load the list. Try refreshing."));
  }, [userId]);

  function selectBuddy(buddy: Buddy) {
    setSelectedBuddy(buddy);
    setStep("rank");
  }

  function getExistingRatings(): Record<number, AffinityTier> {
    if (!selectedBuddy) return {};
    const result: Record<number, AffinityTier> = {};
    for (const a of allAffinities) {
      if (a.buddyId === selectedBuddy.id) {
        result[a.experienceId] = a.tier as AffinityTier;
      }
    }
    return result;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-sm text-[#1A1A1A]/50">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-xl mx-auto px-6 py-14">
        {/* Wordmark */}
        <div className="mb-10 text-center">
          <span className="font-serif text-xl tracking-tight">
            Myra
            <span className="inline-block w-[5px] h-[5px] rounded-full bg-[#EBCFBE] ml-[3px] mb-[2px] align-middle" />
          </span>
        </div>

        {step === "loading" && (
          <p className="text-sm text-[#1A1A1A]/40 text-center">Loading…</p>
        )}

        {step === "pick-name" && (
          <div>
            <h1 className="font-serif text-2xl mb-2 text-center">Who are you?</h1>
            <p className="text-sm text-[#1A1A1A]/50 text-center mb-8">
              Pick your name to rate the destination list.
            </p>
            {buddies.length === 0 ? (
              <p className="text-sm text-[#1A1A1A]/40 text-center">
                No buddies set up yet — ask Ashley to add you.
              </p>
            ) : (
              <div className="space-y-2">
                {buddies.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => selectBuddy(b)}
                    className="w-full border border-[#D4D0C8] px-5 py-4 text-left font-serif text-lg hover:border-[#1A1A1A] hover:shadow-sm transition-all"
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "rank" && selectedBuddy && (
          <div>
            <div className="mb-8">
              <button
                onClick={() => setStep("pick-name")}
                className="text-xs text-[#1A1A1A]/40 hover:text-[#1A1A1A] transition-colors mb-6 flex items-center gap-1"
              >
                ← Not {selectedBuddy.name}?
              </button>
              <h1 className="font-serif text-2xl mb-1">
                Hey {selectedBuddy.name} 👋
              </h1>
              <p className="text-sm text-[#1A1A1A]/50">
                Rate these destinations — takes about a minute.
              </p>
            </div>

            {experiences.length === 0 ? (
              <p className="text-sm text-[#1A1A1A]/40">No destinations on the list yet.</p>
            ) : (
              <RankPrototype
                experiences={experiences}
                buddyId={selectedBuddy.id}
                ownerUserId={userId}
                existingRatings={getExistingRatings()}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
