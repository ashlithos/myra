"use client";

import { useState, useRef, useEffect } from "react";
import type { Experience, Buddy, Affinity } from "@/lib/types";

const EMOJI_OPTIONS = [
  "🌍","🌸","🏔️","🌊","🌴","🦋",
  "🌺","🍜","🎭","🌙","⚡","🎨",
  "🧳","🌿","🔮","✨","🏄","🎯",
  "🌹","🦁","🐬","🎪","🌈","🍃",
];

export default function FriendCard({
  buddy,
  experiences,
  affinities,
  activeExpId,
  onFilterChange,
  onEmojiChange,
  onAddPlace,
  onRemovePlace,
  onRemove,
  dimmed,
}: {
  buddy: Buddy;
  experiences: Experience[];
  affinities: Affinity[];
  activeExpId: number | null;
  onFilterChange: (id: number | null) => void;
  onEmojiChange: (emoji: string) => void;
  onAddPlace: (expId: number) => void;
  onRemovePlace: (expId: number) => void;
  onRemove: () => void;
  dimmed: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLDivElement>(null);

  const myExpIds = new Set(affinities.map((a) => a.experienceId));
  const myExperiences = experiences.filter((e) => myExpIds.has(e.id));
  const availableToAdd = experiences.filter((e) => !myExpIds.has(e.id));
  const hasActive = activeExpId !== null && myExpIds.has(activeExpId);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
      if (addRef.current && !addRef.current.contains(e.target as Node)) {
        setAddOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

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
        {myExperiences.length === 0 ? (
          <p className="text-xs text-[#1A1A1A]/30 text-center py-1">No places added yet</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {myExperiences.map((exp) => {
              const isMatch = exp.id === activeExpId;
              return (
                <button
                  key={exp.id}
                  onClick={() => onFilterChange(isMatch ? null : exp.id)}
                  title={isMatch ? "Clear filter" : `Show all friends who want to visit ${exp.name}`}
                  className={`group text-xs px-2.5 py-1 border transition-all flex items-center gap-1 ${
                    isMatch
                      ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                      : "border-[#D4D0C8] text-[#1A1A1A]/60 hover:border-[#1A1A1A]/40"
                  }`}
                >
                  {exp.name}
                  <span
                    onClick={(e) => { e.stopPropagation(); onRemovePlace(exp.id); }}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity leading-none"
                    title="Remove"
                  >
                    ×
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Add place — full-width, always visible */}
      <div className="px-5 pb-5 relative" ref={addRef}>
        {experiences.length === 0 ? (
          <a
            href="/bucket-list"
            className="block w-full py-2 border border-dashed border-[#D4D0C8] text-xs text-center text-[#1A1A1A]/35 hover:text-[#1A1A1A]/60 hover:border-[#1A1A1A]/30 transition-colors"
          >
            Add to bucket list first →
          </a>
        ) : availableToAdd.length === 0 ? (
          <p className="text-xs text-center text-[#1A1A1A]/25">All your places added ✓</p>
        ) : (
          <>
            <button
              onClick={() => setAddOpen(!addOpen)}
              className={`w-full py-2 border border-dashed text-xs text-center transition-colors ${
                addOpen
                  ? "border-[#1A1A1A]/40 text-[#1A1A1A]/70 bg-[#F3F0EB]"
                  : "border-[#D4D0C8] text-[#1A1A1A]/40 hover:border-[#1A1A1A]/30 hover:text-[#1A1A1A]/60"
              }`}
            >
              + Add a place
            </button>
            {addOpen && (
              <div className="absolute bottom-full mb-1 left-5 right-5 z-10 bg-white border border-[#D4D0C8] shadow-md max-h-52 overflow-y-auto">
                <div className="px-3 py-2 border-b border-[#D4D0C8] text-[10px] tracking-[0.1em] uppercase text-[#1A1A1A]/35">
                  From your bucket list
                </div>
                {availableToAdd.map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => { onAddPlace(exp.id); setAddOpen(false); }}
                    className="w-full text-left px-3 py-2.5 text-sm text-[#1A1A1A]/70 hover:bg-[#F3F0EB] border-b border-[#D4D0C8] last:border-b-0 transition-colors"
                  >
                    {exp.name}
                    {exp.country && (
                      <span className="text-xs text-[#1A1A1A]/35 ml-1.5">{exp.country}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
