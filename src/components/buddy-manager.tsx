"use client";

import { useState } from "react";
import type { Buddy } from "@/lib/types";

export default function BuddyManager({
  initial,
  onUpdate,
}: {
  initial: Buddy[];
  onUpdate: (buddies: Buddy[]) => void;
}) {
  const [buddies, setBuddies] = useState<Buddy[]>(initial);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);

  async function add() {
    if (!input.trim()) return;
    setAdding(true);
    const res = await fetch("/api/buddies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: input.trim() }),
    });
    if (res.ok) {
      const buddy = await res.json();
      const next = [...buddies, buddy];
      setBuddies(next);
      onUpdate(next);
      setInput("");
    }
    setAdding(false);
  }

  async function remove(id: number) {
    await fetch(`/api/buddies/${id}`, { method: "DELETE" });
    const next = buddies.filter((b) => b.id !== id);
    setBuddies(next);
    onUpdate(next);
  }

  return (
    <div>
      <h2 className="text-[10px] tracking-[0.2em] uppercase text-[#1A1A1A]/50 mb-4">
        Travel Buddies
      </h2>
      <div className="space-y-2 mb-4">
        {buddies.length === 0 && (
          <p className="text-sm text-[#1A1A1A]/40">No buddies yet — add one below.</p>
        )}
        {buddies.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between border-t border-[#D4D0C8] py-3"
          >
            <span className="text-sm">{b.name}</span>
            <button
              onClick={() => remove(b.id)}
              className="text-xs text-[#1A1A1A]/30 hover:text-[#1A1A1A]/70 transition-colors"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Friend's name"
          className="flex-1 border border-[#D4D0C8] px-3 py-2 text-sm focus:outline-none focus:border-[#1A1A1A] bg-transparent"
        />
        <button
          onClick={add}
          disabled={adding || !input.trim()}
          className="px-4 py-2 text-xs tracking-[0.15em] uppercase border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
