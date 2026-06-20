"use client";

import { useState, useRef, useEffect } from "react";
import type { Buddy, FriendPlace } from "@/lib/types";

const EMOJI_OPTIONS = [
  "🌍","🌸","🏔️","🌊","🌴","🦋",
  "🌺","🍜","🎭","🌙","⚡","🎨",
  "🧳","🌿","🔮","✨","🏄","🎯",
  "🌹","🦁","🐬","🎪","🌈","🍃",
];

export default function FriendCard({
  buddy,
  places,
  activeName,
  onFilterChange,
  onEmojiChange,
  onAddPlace,
  onRemovePlace,
  onRemove,
  dimmed,
}: {
  buddy: Buddy;
  places: FriendPlace[];
  activeName: string | null;
  onFilterChange: (name: string | null) => void;
  onEmojiChange: (emoji: string) => void;
  onAddPlace: (name: string) => void;
  onRemovePlace: (id: number, name: string) => void;
  onRemove: () => void;
  dimmed: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [input, setInput] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasActive = activeName !== null && places.some((p) => p.name === activeName);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    onAddPlace(trimmed);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <div
      className={`bg-white flex flex-col transition-all duration-200 ${
        dimmed
          ? "border border-[#D4D0C8] opacity-30"
          : hasActive
          ? "border-2 border-[#1A1A1A] opacity-100"
          : "border border-[#D4D0C8] opacity-100"
      }`}
    >
      {/* Remove */}
      <div className="flex justify-end px-4 pt-3">
        <button
          onClick={onRemove}
          className="text-[10px] text-[#1A1A1A]/20 hover:text-[#1A1A1A]/50 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Emoji + name */}
      <div className="flex flex-col items-center px-6 pt-1 pb-5 gap-3 relative" ref={pickerRef}>
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="w-20 h-20 rounded-full bg-[#F3F0EB] flex items-center justify-center text-5xl hover:bg-[#E8E4DC] transition-colors select-none"
          title="Change emoji"
        >
          {buddy.emoji || "🌍"}
        </button>

        {pickerOpen && (
          <div className="absolute top-[88px] left-1/2 -translate-x-1/2 z-20 bg-white border border-[#D4D0C8] shadow-lg p-2 grid grid-cols-6 gap-1 w-52">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => { onEmojiChange(e); setPickerOpen(false); }}
                className="text-xl p-1.5 hover:bg-[#F3F0EB] rounded transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        <span className="font-serif text-lg">{buddy.name}</span>
      </div>

      {/* Places */}
      <div className="px-5 pb-4 flex-1">
        {places.length === 0 ? (
          <p className="text-xs text-[#1A1A1A]/25 text-center py-1">
            No places yet — add one below
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {places.map((place) => {
              const isMatch = place.name === activeName;
              return (
                <button
                  key={place.id}
                  onClick={() => onFilterChange(isMatch ? null : place.name)}
                  title={isMatch ? "Clear filter" : `Show all friends who want to visit ${place.name}`}
                  className={`group text-xs px-2.5 py-1 border transition-all flex items-center gap-1 ${
                    isMatch
                      ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                      : "border-[#D4D0C8] text-[#1A1A1A]/60 hover:border-[#1A1A1A]/40"
                  }`}
                >
                  {place.name}
                  <span
                    onClick={(e) => { e.stopPropagation(); onRemovePlace(place.id, place.name); }}
                    title="Remove"
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity leading-none"
                  >
                    ×
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Inline add input */}
      <div className="px-5 pb-5">
        <div className="flex gap-1.5">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add a place…"
            className="flex-1 border border-[#D4D0C8] px-3 py-2 text-xs focus:outline-none focus:border-[#1A1A1A]/50 bg-transparent placeholder:text-[#1A1A1A]/25 min-w-0"
          />
          <button
            onClick={handleAdd}
            disabled={!input.trim()}
            className="px-3 py-2 border border-[#D4D0C8] text-xs text-[#1A1A1A]/50 hover:border-[#1A1A1A]/40 hover:text-[#1A1A1A] transition-colors disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
