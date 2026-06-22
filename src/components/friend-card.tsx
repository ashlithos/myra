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
      {/* Remove — large tap area, visually small */}
      <div className="flex justify-end px-3 pt-2">
        <button
          onClick={onRemove}
          aria-label="Remove friend"
          className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[10px] text-[#1A1A1A]/25 hover:text-[#1A1A1A]/55 transition-colors -mr-1"
        >
          ✕
        </button>
      </div>

      {/* Emoji + name */}
      <div className="flex flex-col items-center px-6 pt-0 pb-5 gap-3 relative" ref={pickerRef}>
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="w-20 h-20 rounded-full bg-[#F3F0EB] flex items-center justify-center text-5xl hover:bg-[#E8E4DC] active:bg-[#E0DCD3] transition-colors select-none"
          aria-label="Change emoji"
        >
          {buddy.emoji || "🌍"}
        </button>

        {pickerOpen && (
          <div className="absolute top-[84px] left-1/2 -translate-x-1/2 z-20 bg-white border border-[#D4D0C8] shadow-lg p-2 grid grid-cols-6 gap-1 w-52 max-w-[calc(100vw-2rem)]">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => { onEmojiChange(e); setPickerOpen(false); }}
                className="text-xl p-2 hover:bg-[#F3F0EB] active:bg-[#E8E4DC] rounded transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
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
          <div className="flex flex-wrap gap-2">
            {places.map((place) => {
              const isMatch = place.name === activeName;
              return (
                <span
                  key={place.id}
                  className={`group inline-flex items-center gap-1 text-xs border transition-all ${
                    isMatch
                      ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                      : "border-[#D4D0C8] text-[#1A1A1A]/60"
                  }`}
                >
                  <button
                    onClick={() => onFilterChange(isMatch ? null : place.name)}
                    title={isMatch ? "Clear filter" : `Show all friends who want to visit ${place.name}`}
                    className="px-2.5 py-2 leading-none"
                  >
                    {place.name}
                  </button>
                  <button
                    onClick={() => onRemovePlace(place.id, place.name)}
                    aria-label={`Remove ${place.name}`}
                    className={`pr-2 py-2 leading-none transition-opacity ${
                      isMatch
                        ? "opacity-60 hover:opacity-100"
                        : "opacity-30 sm:opacity-0 sm:group-hover:opacity-50 hover:opacity-100"
                    }`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Inline add input */}
      <div className="px-5 pb-5">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add a place…"
            className="flex-1 border border-[#D4D0C8] px-3 py-3 text-sm focus:outline-none focus:border-[#1A1A1A]/50 bg-transparent placeholder:text-[#1A1A1A]/25 min-w-0"
          />
          <button
            onClick={handleAdd}
            disabled={!input.trim()}
            aria-label="Add place"
            className="min-w-[44px] min-h-[44px] border border-[#D4D0C8] text-sm text-[#1A1A1A]/50 hover:border-[#1A1A1A]/40 hover:text-[#1A1A1A] active:bg-[#F3F0EB] transition-colors disabled:opacity-30 flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
