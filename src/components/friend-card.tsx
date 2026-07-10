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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function handleInputChange(value: string) {
    setInput(value);
    setActiveSuggestion(-1);
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (value.trim().length >= 2) {
      suggestTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(value.trim())}`);
          const data = await res.json();
          setSuggestions(data);
        } catch {
          setSuggestions([]);
        }
      }, 300);
    } else {
      setSuggestions([]);
    }
  }

  function selectSuggestion(name: string) {
    setInput("");
    setSuggestions([]);
    setActiveSuggestion(-1);
    onAddPlace(name);
    inputRef.current?.focus();
  }

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    setSuggestions([]);
    setActiveSuggestion(-1);
    onAddPlace(trimmed);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestion((prev) => Math.max(prev - 1, -1));
        return;
      }
      if (e.key === "Enter" && activeSuggestion >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[activeSuggestion]);
        return;
      }
      if (e.key === "Escape") {
        setSuggestions([]);
        setActiveSuggestion(-1);
        return;
      }
    }
    if (e.key === "Enter") handleAdd();
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
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[10px] text-[#1A1A1A]/45 hover:text-[#1A1A1A]/70 transition-colors -mr-1"
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
                className="text-xl p-2 hover:bg-[#F3F0EB] active:bg-[#E8E4DC] rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
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
          <p className="text-xs text-[#1A1A1A]/60 text-center py-1">
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
                    className="px-2.5 py-2 leading-none min-h-[44px] inline-flex items-center"
                  >
                    {place.name}
                  </button>
                  <button
                    onClick={() => onRemovePlace(place.id, place.name)}
                    aria-label={`Remove ${place.name}`}
                    className={`pr-2 py-2 leading-none min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-opacity ${
                      isMatch
                        ? "opacity-60 hover:opacity-100 focus-visible:opacity-100"
                        : "opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
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

      {/* Inline add input with autocomplete */}
      <div className="px-5 pb-5">
        <div className="relative">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => setTimeout(() => setSuggestions([]), 150)}
              placeholder="Add a place…"
              autoComplete="off"
              aria-label="Add a place"
              aria-autocomplete="list"
              aria-controls={suggestions.length > 0 ? `suggestions-${buddy.id}` : undefined}
              aria-activedescendant={activeSuggestion >= 0 ? `suggestion-${buddy.id}-${activeSuggestion}` : undefined}
              className="flex-1 border border-[#D4D0C8] min-h-[44px] px-3 py-3 text-sm focus:outline-none focus:border-[#1A1A1A]/50 bg-transparent placeholder:text-[#1A1A1A]/45 min-w-0"
            />
            <button
              onClick={handleAdd}
              disabled={!input.trim()}
              aria-label="Add place"
              className="min-w-[44px] min-h-[44px] border border-[#D4D0C8] text-sm text-[#1A1A1A]/70 hover:border-[#1A1A1A]/40 hover:text-[#1A1A1A] active:bg-[#F3F0EB] transition-colors disabled:opacity-30 flex items-center justify-center"
            >
              +
            </button>
          </div>
          {suggestions.length > 0 && (
            <div
              id={`suggestions-${buddy.id}`}
              role="listbox"
              aria-label="Place suggestions"
              className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-[#D4D0C8] shadow-md z-20"
            >
              {suggestions.map((s, idx) => (
                <button
                  key={s}
                  id={`suggestion-${buddy.id}-${idx}`}
                  role="option"
                  aria-selected={idx === activeSuggestion}
                  onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                  className={`w-full text-left px-3 py-2.5 min-h-[44px] flex items-center text-sm transition-colors ${
                    idx === activeSuggestion
                      ? "bg-[#F3F0EB] text-[#1A1A1A]"
                      : "text-[#1A1A1A]/70 hover:bg-[#F3F0EB] hover:text-[#1A1A1A]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
