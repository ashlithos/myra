"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Shuffle, Heart, TrendingUp, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Suggestion {
  name: string;
  country: string;
  metric: string;
  metricType: "trending" | "loved" | "popular";
}

const SUGGESTIONS: Suggestion[] = [
  { name: "Northern Lights in Iceland", country: "Iceland", metric: "94% say life-changing", metricType: "loved" },
  { name: "Machu Picchu sunrise hike", country: "Peru", metric: "2.1M mentions", metricType: "popular" },
  { name: "Santorini sunset", country: "Greece", metric: "Trending 2026", metricType: "trending" },
  { name: "Safari in Serengeti", country: "Tanzania", metric: "1.8M mentions", metricType: "popular" },
  { name: "Cherry blossom season in Kyoto", country: "Japan", metric: "89% say magical", metricType: "loved" },
  { name: "Bali rice terraces", country: "Indonesia", metric: "Trending 2026", metricType: "trending" },
  { name: "Walk the Camino de Santiago", country: "Spain", metric: "91% say transformative", metricType: "loved" },
  { name: "Great Barrier Reef diving", country: "Australia", metric: "1.4M mentions", metricType: "popular" },
  { name: "Petra by candlelight", country: "Jordan", metric: "97% say unforgettable", metricType: "loved" },
  { name: "Hot air balloon over Cappadocia", country: "Turkey", metric: "Trending 2026", metricType: "trending" },
  { name: "Maldives overwater villa", country: "Maldives", metric: "1.6M mentions", metricType: "popular" },
  { name: "Road trip along Route 66", country: "USA", metric: "88% say iconic", metricType: "loved" },
  { name: "Amalfi Coast drive", country: "Italy", metric: "1.2M mentions", metricType: "popular" },
  { name: "Swim in cenotes", country: "Mexico", metric: "Trending 2026", metricType: "trending" },
  { name: "Taj Mahal at sunrise", country: "India", metric: "92% say breathtaking", metricType: "loved" },
  { name: "Hike Patagonia's Torres del Paine", country: "Chile", metric: "Trending 2026", metricType: "trending" },
  { name: "Gondola ride in Venice", country: "Italy", metric: "1.9M mentions", metricType: "popular" },
  { name: "Explore Marrakech souks", country: "Morocco", metric: "86% say sensory overload", metricType: "loved" },
  { name: "New Year's Eve in Sydney", country: "Australia", metric: "1.1M mentions", metricType: "popular" },
  { name: "Train ride through Swiss Alps", country: "Switzerland", metric: "Trending 2026", metricType: "trending" },
  { name: "Angkor Wat at dawn", country: "Cambodia", metric: "93% say awe-inspiring", metricType: "loved" },
  { name: "Northern Norway whale watching", country: "Norway", metric: "Trending 2026", metricType: "trending" },
  { name: "La Tomatina festival", country: "Spain", metric: "850K mentions", metricType: "popular" },
  { name: "Floating markets of Bangkok", country: "Thailand", metric: "87% say vibrant", metricType: "loved" },
];

const METRIC_ICON = {
  trending: TrendingUp,
  loved: Heart,
  popular: Users,
};

const METRIC_COLOR = {
  trending: "text-[#1A1A1A]/70",
  loved: "text-[#EBCFBE]",
  popular: "text-[#1A1A1A]/60",
};

const BATCH_SIZE = 5;

export default function BucketListSuggestions({
  existingNames,
}: {
  existingNames: string[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [shuffleKey, setShuffleKey] = useState(0);
  const [phase, setPhase] = useState<"visible" | "exit" | "enter">("visible");
  const [spinIcon, setSpinIcon] = useState(false);

  const normalizedExisting = new Set(
    existingNames.map((n) => n.toLowerCase().trim())
  );

  const available = SUGGESTIONS.filter(
    (s) => !normalizedExisting.has(s.name.toLowerCase().trim())
  );

  const getShuffled = useCallback(() => {
    const arr = [...available];
    let seed = shuffleKey + 1;
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 16807 + 11) % 2147483647;
      const j = seed % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, BATCH_SIZE);
  }, [available.length, shuffleKey]);

  const visible = getShuffled();

  if (available.length === 0) return null;

  function handleClick(suggestion: Suggestion) {
    const params = new URLSearchParams({
      name: suggestion.name,
      country: suggestion.country,
    });
    router.push(`/bucket-list/new?${params.toString()}`);
  }

  function handleShuffle() {
    if (phase !== "visible") return;
    setSpinIcon(true);
    setPhase("exit");

    // After exit animation completes, swap data and enter
    setTimeout(() => {
      setShuffleKey((k) => k + 1);
      setPhase("enter");

      // After enter animation completes, go back to visible
      setTimeout(() => {
        setPhase("visible");
        setSpinIcon(false);
      }, 350);
    }, 300);
  }

  const chipStyle = (index: number) => {
    if (phase === "exit") {
      return {
        opacity: 0,
        transform: "translateY(8px)",
        transition: `all 250ms cubic-bezier(0.25, 1, 0.5, 1)`,
        transitionDelay: `${index * 40}ms`,
      };
    }
    if (phase === "enter") {
      return {
        opacity: 1,
        transform: "translateY(0)",
        transition: `all 300ms cubic-bezier(0.25, 1, 0.5, 1)`,
        transitionDelay: `${index * 60}ms`,
      };
    }
    return {
      opacity: 1,
      transform: "translateY(0)",
      transition: `all 300ms cubic-bezier(0.25, 1, 0.5, 1)`,
    };
  };

  // Force initial enter state for new chips
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (phase === "enter") setMounted(false);
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [phase, shuffleKey]);

  return (
    <div className="mt-16 border-t border-[#D4D0C8]/50 pt-10">
      <div className="flex items-center gap-2 mb-5">
        <Sparkles size={13} className="text-[#1A1A1A]/25" />
        <h2 className="text-[10px] tracking-[0.25em] uppercase text-[#1A1A1A]/70">
          {t("bucket.inspiration")}
        </h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {visible.map((s, i) => {
          const Icon = METRIC_ICON[s.metricType];
          return (
            <button
              key={`${shuffleKey}-${s.name}`}
              onClick={() => handleClick(s)}
              className="group inline-flex items-center gap-2 border border-[#D4D0C8] px-3.5 py-2.5 md:px-3 md:py-2 min-h-[44px] hover:border-[#1A1A1A]/25 hover:bg-white active:bg-white"
              style={chipStyle(i)}
            >
              <span className="text-xs text-[#1A1A1A]/70 group-hover:text-[#1A1A1A] transition-colors">
                {s.name}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <Icon size={8} className={METRIC_COLOR[s.metricType]} />
                <span className="text-[8px] tracking-[0.05em] text-[#1A1A1A]/60">
                  {s.metric}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleShuffle}
        disabled={phase !== "visible"}
        className="mt-4 inline-flex items-center min-h-[44px] gap-1.5 text-[10px] tracking-[0.15em] uppercase text-[#1A1A1A]/70 hover:text-[#1A1A1A]/70 transition-colors disabled:opacity-50"
      >
        <Shuffle
          size={11}
          className={`transition-transform duration-500 ${spinIcon ? "rotate-180" : ""}`}
          style={{ transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)" }}
        />
        {t("bucket.shuffle")}
      </button>
    </div>
  );
}
