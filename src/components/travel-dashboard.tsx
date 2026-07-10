"use client";

import { useState } from "react";
import type { Buddy, FriendPlace } from "@/lib/types";
import FriendCard from "@/components/friend-card";

const EMOJI_OPTIONS = [
  "🌍","🌸","🏔️","🌊","🌴","🦋",
  "🌺","🍜","🎭","🌙","⚡","🎨",
  "🧳","🌿","🔮","✨","🏄","🎯",
  "🌹","🦁","🐬","🎪","🌈","🍃",
];

export default function TravelDashboard({
  initialBuddies,
  initialFriendPlaces,
  rankUrl,
  userId: _userId,
}: {
  initialBuddies: Buddy[];
  initialFriendPlaces: FriendPlace[];
  rankUrl: string;
  userId: string;
}) {
  const [buddies, setBuddies] = useState<Buddy[]>(initialBuddies);
  const [friendPlaces, setFriendPlaces] = useState<FriendPlace[]>(initialFriendPlaces);
  const [activeName, setActiveName] = useState<string | null>(null);
  const [addingFriend, setAddingFriend] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("🌍");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);

  function getPlaces(buddyId: number) {
    return friendPlaces.filter((p) => p.buddyId === buddyId);
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
      setEmojiPickerOpen(false);
      setAddingFriend(false);
    }
    setAdding(false);
  }

  async function removeBuddy(id: number) {
    await fetch(`/api/buddies/${id}`, { method: "DELETE" });
    setBuddies((prev) => prev.filter((b) => b.id !== id));
    setFriendPlaces((prev) => prev.filter((p) => p.buddyId !== id));
    setActiveName(null);
  }

  async function changeEmoji(buddyId: number, emoji: string) {
    await fetch(`/api/buddies/${buddyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    setBuddies((prev) => prev.map((b) => (b.id === buddyId ? { ...b, emoji } : b)));
  }

  async function addPlace(buddyId: number, name: string) {
    const res = await fetch("/api/friend-places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buddyId, name }),
    });
    if (res.ok) {
      const place = await res.json();
      setFriendPlaces((prev) => [...prev, place]);
    }
  }

  async function removePlace(id: number, name: string) {
    await fetch(`/api/friend-places/${id}`, { method: "DELETE" });
    setFriendPlaces((prev) => prev.filter((p) => p.id !== id));
    if (activeName === name) setActiveName(null);
  }

  function copyLink() {
    navigator.clipboard.writeText(rankUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#1A1A1A]/60 mb-1">
          Travel Matching
        </p>
        <h1 className="font-serif text-3xl">Who wants to go where</h1>
      </div>

      {/* Active filter banner */}
      {activeName && (
        <div className="mb-5 flex items-center gap-3 text-sm">
          <span className="text-[#1A1A1A]/70">
            Friends who want to visit{" "}
            <strong className="text-[#1A1A1A]">{activeName}</strong>
          </span>
          <button
            onClick={() => setActiveName(null)}
            className="min-h-[44px] inline-flex items-center px-3 text-xs text-[#1A1A1A]/60 hover:text-[#1A1A1A] underline underline-offset-2 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
        {buddies.map((buddy) => {
          const places = getPlaces(buddy.id);
          const hasActive = activeName !== null && places.some((p) => p.name === activeName);
          const dimmed = activeName !== null && !hasActive;
          return (
            <FriendCard
              key={buddy.id}
              buddy={buddy}
              places={places}
              activeName={activeName}
              onFilterChange={setActiveName}
              onEmojiChange={(emoji) => changeEmoji(buddy.id, emoji)}
              onAddPlace={(name) => addPlace(buddy.id, name)}
              onRemovePlace={(id, name) => removePlace(id, name)}
              onRemove={() => removeBuddy(buddy.id)}
              dimmed={dimmed}
            />
          );
        })}

        {/* Add friend */}
        {addingFriend ? (
          <div className="border border-[#D4D0C8] bg-white p-5 flex flex-col gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addBuddy()}
              placeholder="Friend's name"
              autoFocus
              className="border border-[#D4D0C8] min-h-[44px] px-3 py-2 text-sm focus:outline-none focus:border-[#1A1A1A] bg-transparent"
            />
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                className="w-16 h-16 rounded-full bg-[#F3F0EB] flex items-center justify-center text-4xl hover:bg-[#E8E4DC] active:bg-[#E0DCD3] transition-colors"
                aria-label="Choose emoji"
              >
                {newEmoji}
              </button>
              <span className="text-[10px] tracking-[0.15em] uppercase text-[#1A1A1A]/60">
                {emojiPickerOpen ? "Close" : "Choose icon"}
              </span>
            </div>
            {emojiPickerOpen && (
              <div className="grid grid-cols-6 gap-1">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => { setNewEmoji(e); setEmojiPickerOpen(false); }}
                    className={`text-xl p-2 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
                      newEmoji === e
                        ? "bg-[#1A1A1A]/10 ring-1 ring-[#1A1A1A]/20"
                        : "hover:bg-[#F3F0EB] active:bg-[#E8E4DC]"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={addBuddy}
                disabled={adding || !newName.trim()}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center py-2 text-xs tracking-[0.15em] uppercase border border-[#1A1A1A] bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80 transition-colors disabled:opacity-40"
              >
                {adding ? "Adding…" : "Add"}
              </button>
              <button
                onClick={() => {
                  setAddingFriend(false);
                  setNewName("");
                  setNewEmoji("🌍");
                  setEmojiPickerOpen(false);
                }}
                className="min-h-[44px] inline-flex items-center justify-center px-3 py-2 text-xs border border-[#D4D0C8] text-[#1A1A1A]/70 hover:border-[#1A1A1A]/40 transition-colors"
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
            <span className="text-4xl text-[#1A1A1A]/45">+</span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#1A1A1A]/60">
              Add friend
            </span>
          </button>
        )}
      </div>

      {/* Share link — secondary */}
      <div className="border-t border-[#D4D0C8] pt-5 flex items-center gap-4">
        <div>
          <p className="text-[10px] tracking-[0.15em] uppercase text-[#1A1A1A]/60 mb-0.5">
            Friend link
          </p>
          <p className="text-xs font-mono text-[#1A1A1A]/60">{rankUrl}</p>
        </div>
        <button
          onClick={copyLink}
          className="ml-auto min-h-[44px] inline-flex items-center justify-center text-xs tracking-[0.15em] uppercase border border-[#D4D0C8] px-4 py-2 hover:border-[#1A1A1A]/40 transition-colors"
        >
          {copied ? "Copied ✓" : "Copy ↗"}
        </button>
      </div>
    </div>
  );
}
