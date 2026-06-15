"use client";

import { useState } from "react";
import type { Experience, Buddy, Affinity } from "@/lib/types";
import BuddyManager from "@/components/buddy-manager";
import TravelMatrix from "@/components/travel-matrix";

export default function TravelDashboard({
  experiences,
  initialBuddies,
  initialAffinities,
  rankUrl,
  userId: _userId,
}: {
  experiences: Experience[];
  initialBuddies: Buddy[];
  initialAffinities: Affinity[];
  rankUrl: string;
  userId: string;
}) {
  const [buddies, setBuddies] = useState<Buddy[]>(initialBuddies);
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(rankUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#1A1A1A]/40 mb-2">
          Travel Matching
        </p>
        <h1 className="font-serif text-3xl mb-1">Who wants to go where</h1>
        <p className="text-sm text-[#1A1A1A]/50">
          The always-on map of your travel buddies&apos; interests.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12">
        {/* Left sidebar */}
        <div className="space-y-10">
          {/* Shared link */}
          <div>
            <h2 className="text-[10px] tracking-[0.2em] uppercase text-[#1A1A1A]/50 mb-4">
              Friend Link
            </h2>
            <p className="text-xs text-[#1A1A1A]/50 mb-3">
              One link — friends pick their name and rate. Send over iMessage.
            </p>
            <div className="border border-[#D4D0C8] px-3 py-2 text-xs text-[#1A1A1A]/50 font-mono break-all mb-2">
              {rankUrl}
            </div>
            <button
              onClick={copyLink}
              className="w-full py-2 text-xs tracking-[0.15em] uppercase border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors"
            >
              {copied ? "Copied ✓" : "Copy link"}
            </button>
          </div>

          {/* Buddy manager */}
          <BuddyManager initial={buddies} onUpdate={setBuddies} />
        </div>

        {/* Matrix */}
        <div>
          {experiences.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-serif text-xl text-[#1A1A1A]/40 mb-2">No destinations yet</p>
              <p className="text-sm text-[#1A1A1A]/40">
                Add experiences to your{" "}
                <a href="/bucket-list" className="underline underline-offset-2 hover:text-[#1A1A1A]">
                  bucket list
                </a>{" "}
                — they&apos;ll appear here automatically.
              </p>
            </div>
          ) : (
            <TravelMatrix
              experiences={experiences}
              buddies={buddies}
              affinities={initialAffinities}
            />
          )}
        </div>
      </div>
    </div>
  );
}
