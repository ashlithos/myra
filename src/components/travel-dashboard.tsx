"use client";

import { useState } from "react";
import type { Experience, Buddy, Affinity } from "@/lib/types";
import FriendCard from "@/components/friend-card";

const EMOJI_OPTIONS = [
  "🌍","🌸","🏔️","🌊","🌴","🦋",
  "🌺","🍜","🎭","🌙","⚡","🎨",
  "🧳","🌿","🔮","✨","🏄","🎯",
  "🌹","🦁","🐬","🎪","🌈","🍃",
];

export default function TravelDashboard({
  experiences,
  initialBuddies,
  initialAffinities,
  rankUrl,
  userId,
}: {
  experiences: Experience[];
  initialBuddies: Buddy[];
  initialAffinities: Affinity[];
  rankUrl: string;
  userId: string;
}) {
  const [buddies, setBuddies] = useState<Buddy[]>(initialBuddies);
  const [affinities, setAffinities] = useState<Affinity[]>(initialAffinities);
  const [activeExpId, setActiveExpId] = useState<number | null>(null);
  const [addingFriend, setAddingFriend] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("🌍");
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);

  function getAffinities(buddyId: number) {
    return affinities.filter((a) => a.buddyId === buddyId);
  }

  async function addBuddy() {
    if (!newName.trim()) return;
    setAdding(true);
    const res = await fetch("/api/buddies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), emoji: newEmoji }),
    });
    if (res.ok) {
      const buddy = await res.json();
      setBuddies((prev) => [...prev, buddy]);
      setNewName("");
      setNewEmoji("🌍");
      setAddingFriend(false);
    }
    setAdding(false);
  }

  async function removeBuddy(id: number) {
    await fetch(`/api/buddies/${id}`, { method: "DELETE" });
    setBuddies((prev) => prev.filter((b) => b.id !== id));
    setAffinities((prev) => prev.filter((a) => a.buddyId !== id));
    setActiveExpId(null);
  }

  async function changeEmoji(buddyId: number, emoji: string) {
    await fetch(`/api/buddies/${buddyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    setBuddies((prev) => prev.map((b) => (b.id === buddyId ? { ...b, emoji } : b)));
  }

  async function addPlace(buddyId: number, expId: number) {
    await fetch("/api/affinities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buddyId,
        ownerUserId: userId,
        ratings: [{ experienceId: expId, tier: "take-me-there" }],
      }),
    });
    setAffinities((prev) => [
      ...prev,
      {
        id: Date.now(),
        buddyId,
        experienceId: expId,
        tier: "take-me-there" as const,
        updatedAt: new Date().toISOString(),
      },
    ]);
  }

  async function removePlace(buddyId: number, expId: number) {
    await fetch(`/api/affinities?buddyId=${buddyId}&experienceId=${expId}`, { method: "DELETE" });
    setAffinities((prev) =>
      prev.filter((a) => !(a.buddyId === buddyId && a.experienceId === expId))
    );
    if (activeExpId === expId) setActiveExpId(null);
  }

  function copyLink() {
    navigator.clipboard.writeText(rankUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeExpName = activeExpId
    ? experiences.find((e) => e.id === activeExpId)?.name
    : null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#1A1A1A]/40 mb-1">
          Travel Matching
        </p>
        <h1 className="font-serif text-3xl">Who wants to go where</h1>
      </div>

      {/* Active filter banner */}
      {activeExpName && (
        <div className="mb-5 flex items-center gap-3 text-sm">
          <span className="text-[#1A1A1A]/50">
            Showing friends who want to visit{" "}
            <strong className="text-[#1A1A1A]">{activeExpName}</strong>
          </span>
          <button
            onClick={() => setActiveExpId(null)}
            className="text-xs text-[#1A1A1A]/40 hover:text-[#1A1A1A] underline underline-offset-2 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
        {buddies.map((buddy) => {
          const buddyAffinities = getAffinities(buddy.id);
          const hasActive =
            activeExpId !== null &&
            buddyAffinities.some((a) => a.experienceId === activeExpId);
          const dimmed = activeExpId !== null && !hasActive;
          return (
            <FriendCard
              key={buddy.id}
              buddy={buddy}
              experiences={experiences}
              affinities={buddyAffinities}
              activeExpId={activeExpId}
              onFilterChange={(id) => setActiveExpId((prev) => (prev === id ? null : id))}
              onEmojiChange={(emoji) => changeEmoji(buddy.id, emoji)}
              onAddPlace={(expId) => addPlace(buddy.id, expId)}
              onRemovePlace={(expId) => removePlace(buddy.id, expId)}
              onRemove={() => removeBuddy(buddy.id)}
              dimmed={dimmed}
            />
          );
        })}

        {/* Add friend */}
        {addingFriend ? (
          <div className="border border-[#D4D0C8] bg-white p-5 flex flex-col gap-3">
            {/* Emoji picker */}
            <div className="grid grid-cols-6 gap-1">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setNewEmoji(e)}
                  className={`text-xl p-1 rounded transition-colors ${
                    newEmoji === e ? "bg-[#1A1A1A]/10 ring-1 ring-[#1A1A1A]/20" : "hover:bg-[#F3F0EB]"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            {/* Preview */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-[#F3F0EB] flex items-center justify-center text-4xl">
                {newEmoji}
              </div>
            </div>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addBuddy()}
              placeholder="Friend's name"
              autoFocus
              className="border border-[#D4D0C8] px-3 py-2 text-sm focus:outline-none focus:border-[#1A1A1A] bg-transparent"
            />
            <div className="flex gap-2">
              <button
                onClick={addBuddy}
                disabled={adding || !newName.trim()}
                className="flex-1 py-2 text-xs tracking-[0.15em] uppercase border border-[#1A1A1A] bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80 transition-colors disabled:opacity-40"
              >
                {adding ? "Adding…" : "Add"}
              </button>
              <button
                onClick={() => { setAddingFriend(false); setNewName(""); setNewEmoji("🌍"); }}
                className="px-3 py-2 text-xs border border-[#D4D0C8] text-[#1A1A1A]/50 hover:border-[#1A1A1A]/40 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingFriend(true)}
            className="border border-dashed border-[#D4D0C8] flex flex-col items-center justify-center gap-2 p-8 hover:border-[#1A1A1A]/30 hover:bg-[#F3F0EB]/50 transition-colors min-h-[220px]"
          >
            <span className="text-4xl text-[#1A1A1A]/15">+</span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#1A1A1A]/30">
              Add friend
            </span>
          </button>
        )}
      </div>

      {/* Empty state note */}
      {experiences.length === 0 && (
        <p className="text-sm text-[#1A1A1A]/40 mb-8 text-center">
          Add experiences to your{" "}
          <a href="/bucket-list" className="underline underline-offset-2 hover:text-[#1A1A1A]">
            bucket list
          </a>{" "}
          — they&apos;ll appear here so you can add them to friends.
        </p>
      )}

      {/* Share link — secondary */}
      <div className="border-t border-[#D4D0C8] pt-5 flex items-center gap-4">
        <div>
          <p className="text-[10px] tracking-[0.15em] uppercase text-[#1A1A1A]/35 mb-0.5">
            Friend link
          </p>
          <p className="text-xs font-mono text-[#1A1A1A]/35">{rankUrl}</p>
        </div>
        <button
          onClick={copyLink}
          className="ml-auto text-xs tracking-[0.15em] uppercase border border-[#D4D0C8] px-4 py-2 hover:border-[#1A1A1A]/40 transition-colors"
        >
          {copied ? "Copied ✓" : "Copy ↗"}
        </button>
      </div>
    </div>
  );
}
