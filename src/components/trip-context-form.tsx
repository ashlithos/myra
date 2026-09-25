"use client";

import { useState, useEffect, useRef } from "react";
import { PARTNER_TYPES } from "@/lib/types";
import type { Experience } from "@/lib/types";
import { Search, ArrowRight, BookmarkPlus, ExternalLink, Check, Circle, LoaderCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

interface Recommendation {
  name: string;
  country: string;
  description: string;
  bestMonths: string;
  estimatedDays: number;
  estimatedBudget: string;
  fromBucketList: boolean;
  matchReason: string;
}

interface DiscoverResult {
  recommendations: Recommendation[];
  travelInsight: string;
}

interface PhotoResult {
  url?: string;
  thumbUrl: string;
  altDescription: string | null;
  photographerName: string;
}

const MONTH_KEYS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;

const AGE_RANGES = ["20s", "30s", "40s", "50s", "60+"];

export default function TripContextForm({
  preselectedExperience,
}: {
  preselectedExperience?: Experience;
}) {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [month, setMonth] = useState("");
  const [days, setDays] = useState("7");
  const [companion, setCompanion] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [error, setError] = useState("");
  const [addingToList, setAddingToList] = useState<Set<number>>(new Set());
  const [addedToList, setAddedToList] = useState<Set<number>>(new Set());
  const [thinkingStep, setThinkingStep] = useState(0);
  const thinkingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [photos, setPhotos] = useState<Record<number, PhotoResult>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [previousNames, setPreviousNames] = useState<string[]>([]);

  const PROMPT_SUGGESTIONS = [
    t("discover.chip1"),
    t("discover.chip2"),
    t("discover.chip3"),
  ];

  const THINKING_STEPS = [
    t("discover.thinking1"),
    t("discover.thinking2"),
    t("discover.thinking3"),
    t("discover.thinking4"),
    t("discover.thinking5"),
    t("discover.thinking6"),
  ];

  // Fetch photos when results arrive
  useEffect(() => {
    if (!result) return;
    setPhotos({});
    result.recommendations.forEach(async (rec, i) => {
      try {
        const res = await fetch(`/api/photos/search?query=${encodeURIComponent(`${rec.name} ${rec.country}`)}`);
        const data = await res.json();
        if (data.length > 0) {
          setPhotos((prev) => ({ ...prev, [i]: data[0] }));
        }
      } catch {
        // Skip photo on error
      }
    });
  }, [result]);

  // Cycle through thinking steps while loading
  useEffect(() => {
    if (loading) {
      setThinkingStep(0);
      thinkingInterval.current = setInterval(() => {
        setThinkingStep((prev) => {
          if (prev < THINKING_STEPS.length - 1) return prev + 1;
          return prev;
        });
      }, 2500);
    } else {
      if (thinkingInterval.current) {
        clearInterval(thinkingInterval.current);
        thinkingInterval.current = null;
      }
    }
    return () => {
      if (thinkingInterval.current) clearInterval(thinkingInterval.current);
    };
  }, [loading]);

  async function handleDiscover() {
    setLoading(true);
    setError("");
    setResult(null);

    const effectivePrompt = prompt.trim() || PROMPT_SUGGESTIONS[Math.floor(Math.random() * PROMPT_SUGGESTIONS.length)];
    if (!prompt.trim()) setPrompt(effectivePrompt);

    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: effectivePrompt, month, days, companion, ageRange, budget, lang, previousNames }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      // Track shown names to avoid repeats on "Discover more"
      const newNames = data.recommendations?.map((r: Recommendation) => r.name) || [];
      setPreviousNames((prev) => [...prev, ...newNames]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setLoading(false);
  }

  async function addToBucketList(rec: Recommendation, index: number) {
    setAddingToList((prev) => new Set(prev).add(index));

    const seasonMap: Record<string, string[]> = {
      January: ["winter"], February: ["winter"], March: ["spring"],
      April: ["spring"], May: ["spring"], June: ["summer"],
      July: ["summer"], August: ["summer"], September: ["autumn"],
      October: ["autumn"], November: ["autumn"], December: ["winter"],
    };

    const months = rec.bestMonths.split(/[-–,]/).map((m) => m.trim());
    const seasons = [...new Set(months.flatMap((m) => seasonMap[m] || []))];

    const res = await fetch("/api/experiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: rec.name,
        country: rec.country,
        idealSeasons: seasons.join(","),
        idealPartnerTypes: companion || "",
        doByAge: ageRange ? (ageRange === "60+" ? "60+" : String(parseInt(ageRange) + 10)) : null,
        status: "wishlist",
      }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = "/api/auth/signin?callbackUrl=" + encodeURIComponent(window.location.pathname);
        return;
      }
      setAddingToList((prev) => { const next = new Set(prev); next.delete(index); return next; });
      return;
    }

    const saved = await res.json();

    const photo = photos[index];
    if (photo && saved.id) {
      await fetch(`/api/experiences/${saved.id}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(photo),
      });
    }

    setAddingToList((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    setAddedToList((prev) => new Set(prev).add(index));
  }

  function googleSearchUrl(name: string, country: string) {
    return `https://www.google.com/search?q=${encodeURIComponent(`${name} ${country} travel guide`)}`;
  }

  const hasResults = result || loading || error;

  return (
    <div className={`flex gap-0 ${hasResults ? "flex-col lg:flex-row" : "flex-col"}`}>
      {/* LEFT PANE — Input */}
      <div className={`${hasResults ? "lg:w-[420px] lg:shrink-0 lg:border-r lg:border-[#D4D0C8] lg:pr-10" : "max-w-2xl"}`}>
        {/* Primary: The prompt — hero-sized, dominant */}
        <div className="mb-6">
          <label htmlFor="discover-prompt" className="sr-only">{t("form.nameLabel")}</label>
          <textarea
            id="discover-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("discover.placeholder")}
            className="w-full bg-transparent border-b-2 border-[#D4D0C8] pb-2 md:pb-[12px] pt-0 font-serif text-xl md:text-4xl focus:border-[#1A1A1A]/30 transition-colors placeholder:text-[#1A1A1A]/45 resize-none leading-snug"
            rows={2}
          />
          {!loading && !result && (
            <div className="flex flex-wrap gap-1.5 md:gap-2 mt-3 md:mt-4">
              {PROMPT_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPrompt(s)}
                  className={`min-h-[44px] inline-flex items-center justify-center px-3 py-2 md:px-3.5 md:py-2 text-[11px] md:text-[11px] tracking-[0.03em] rounded-md border transition-colors ${
                    prompt === s
                      ? "border-[#1A1A1A]/30 text-[#1A1A1A]/70"
                      : "border-[#D4D0C8] text-[#1A1A1A]/70 hover:border-[#1A1A1A]/30 hover:text-[#1A1A1A]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Secondary: Quick params — collapse on mobile when results showing */}
        <div className={`grid grid-cols-2 gap-4 mb-4 ${hasResults ? "hidden md:grid" : ""}`}>
          <div>
            <label htmlFor="discover-month" className="text-[13px] md:text-[11px] tracking-[0.1em] uppercase text-[#1A1A1A]/70 mb-1 md:mb-0.5 block">{t("discover.month")}</label>
            <select
              id="discover-month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full min-h-[44px] bg-transparent border-b border-[#D4D0C8] py-2.5 md:py-1.5 text-base md:text-sm focus:border-[#1A1A1A]/40 transition-colors appearance-none cursor-pointer"
            >
              <option value="">{t("discover.any")}</option>
              {MONTH_KEYS.map((m) => (
                <option key={m} value={t(`month.${m}` as any)}>{t(`month.${m}` as any)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="discover-days" className="text-[13px] md:text-[11px] tracking-[0.1em] uppercase text-[#1A1A1A]/70 mb-1 md:mb-0.5 block">{t("discover.days")}</label>
            <select
              id="discover-days"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full min-h-[44px] bg-transparent border-b border-[#D4D0C8] py-2.5 md:py-1.5 text-base md:text-sm focus:border-[#1A1A1A]/40 transition-colors appearance-none cursor-pointer"
            >
              <option value="3">{t("discover.weekend")}</option>
              <option value="7">{t("discover.oneWeek")}</option>
              <option value="14">{t("discover.twoWeeks")}</option>
              <option value="30">{t("discover.oneMonth")}</option>
              <option value="">{t("discover.noLimit")}</option>
            </select>
          </div>
        </div>

        {/* Tertiary: Collapsible filters — hidden on mobile when results showing */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          className={`min-h-[44px] text-xs tracking-[0.1em] uppercase text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors mb-4 flex items-center gap-1.5 ${hasResults ? "hidden md:flex" : ""}`}
        >
          <span className={`text-[7px] inline-block transition-transform duration-300 ${showFilters ? "rotate-90" : ""}`} style={{ transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)" }}>▶</span>
          {companion || ageRange || budget
            ? `${t("discover.whatElsePrefix")}${budget ? ` · ${budget}` : ""}${companion ? ` · ${t(`partner.${companion}` as any)}` : ""}${ageRange ? ` · ${t(`age.${ageRange}` as any)}` : ""}`
            : t("discover.whatElse")}
        </button>

        <div className={`grid transition-[grid-template-rows] duration-350 ${showFilters ? "grid-rows-[1fr]" : "grid-rows-[0fr]"} ${hasResults ? "hidden md:grid" : ""}`} style={{ transitionDuration: "350ms", transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)" }}>
          <div className="overflow-hidden">
          <div className="space-y-4 mb-4 pl-3 border-l border-[#D4D0C8]/50">
            <div>
              <label htmlFor="discover-budget" className="text-[13px] md:text-[11px] tracking-[0.1em] uppercase text-[#1A1A1A]/70 mb-1 md:mb-0.5 block">{t("discover.budget")}</label>
              <input
                id="discover-budget"
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="$2000"
                className="w-full min-h-[44px] bg-transparent border-b border-[#D4D0C8] py-2.5 md:py-1.5 text-base md:text-sm focus:border-[#1A1A1A]/40 transition-colors placeholder:text-[#1A1A1A]/45"
              />
            </div>
            <div>
              <label className="text-[13px] md:text-[11px] tracking-[0.1em] uppercase text-[#1A1A1A]/70 mb-2 md:mb-1.5 block">{t("discover.travelingWith")}</label>
              <div className="flex flex-wrap gap-1.5 md:gap-1" role="group" aria-label={t("discover.travelingWith")}>
                {PARTNER_TYPES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={companion === p}
                    onClick={() => setCompanion(companion === p ? "" : p)}
                    className={`min-h-[44px] md:min-h-[44px] inline-flex items-center justify-center px-3.5 py-2.5 md:px-2.5 md:py-1 text-[13px] md:text-[11px] tracking-[0.1em] uppercase transition-colors ${
                      companion === p
                        ? "bg-[#EBCFBE] text-[#1A1A1A]"
                        : "bg-[#D4D0C8]/20 text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-[#D4D0C8]/40 active:bg-[#D4D0C8]/40"
                    }`}
                  >
                    {t(`partner.${p}` as any)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[13px] md:text-[11px] tracking-[0.1em] uppercase text-[#1A1A1A]/70 mb-2 md:mb-1.5 block">{t("discover.ageRange")}</label>
              <div className="flex flex-wrap gap-1.5 md:gap-1" role="group" aria-label={t("discover.ageRange")}>
                {AGE_RANGES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={ageRange === a}
                    onClick={() => setAgeRange(ageRange === a ? "" : a)}
                    className={`min-h-[44px] md:min-h-[44px] inline-flex items-center justify-center px-3.5 py-2.5 md:px-2.5 md:py-1 text-[13px] md:text-[11px] tracking-[0.1em] uppercase transition-colors ${
                      ageRange === a
                        ? "bg-[#1A1A1A] text-white"
                        : "bg-[#D4D0C8]/20 text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-[#D4D0C8]/40 active:bg-[#D4D0C8]/40"
                    }`}
                  >
                    {t(`age.${a}` as any)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Discover button — hidden on mobile when results showing */}
        <div className={`pt-2 ${hasResults ? "hidden md:block" : ""}`}>
          <button
            onClick={handleDiscover}
            disabled={loading}
            className={`w-full py-4 md:py-3.5 text-xs md:text-[11px] tracking-[0.25em] uppercase flex items-center justify-center gap-2.5 transition-all ${
              loading
                ? "bg-[#1A1A1A]/80 text-white"
                : "bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/85 disabled:bg-[#D4D0C8] disabled:text-[#1A1A1A]/30 disabled:cursor-not-allowed"
            }`}
          >
            <Search size={13} className={loading ? "animate-bounce" : ""} />
            {loading ? t("discover.discovering") : t("discover.button")}
          </button>
        </div>
      </div>

      {/* RIGHT PANE — Output */}
      {hasResults && (
        <div className="lg:flex-1 lg:pl-10 mt-10 lg:mt-0 min-w-0">
          {/* Loading */}
          {loading && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="font-serif text-[26px] md:text-xl leading-tight">{t("discover.findingTrips")}</h2>
                <div
                  role="progressbar"
                  aria-label={t("discover.findingTrips")}
                  aria-valuemin={0}
                  aria-valuemax={THINKING_STEPS.length}
                  aria-valuenow={thinkingStep + 1}
                  className="h-1.5 rounded-full bg-[#E3DFD6] overflow-hidden"
                >
                  <div
                    className="h-full rounded-full bg-[#1A1A1A] transition-[width] duration-700 motion-reduce:transition-none"
                    style={{ width: `${((thinkingStep + 1) / THINKING_STEPS.length) * 100}%` }}
                  />
                </div>
              </div>

              <ol aria-live="polite" className="space-y-3.5 md:space-y-2.5">
                {THINKING_STEPS.map((step, i) => (
                  <li
                    key={step}
                    className={`flex items-center gap-3 transition-colors duration-500 ${
                      i < thinkingStep
                        ? "text-base md:text-sm text-[#5C5A55]"
                        : i === thinkingStep
                        ? "text-[17px] md:text-[15px] font-semibold text-[#1A1A1A]"
                        : "text-base md:text-sm text-[#6E6B65]"
                    }`}
                  >
                    {i < thinkingStep ? (
                      <Check size={20} className="shrink-0 text-[#3D6B4F]" aria-hidden />
                    ) : i === thinkingStep ? (
                      <LoaderCircle size={20} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />
                    ) : (
                      <Circle size={20} strokeWidth={1.5} className="shrink-0" aria-hidden />
                    )}
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              {/* Skeleton cards — mirror the result card layout */}
              <div aria-hidden>
                {[1, 2].map((n) => (
                  <div key={n} className="border-t border-[#D4D0C8] py-6 md:py-5">
                    <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start">
                      <div className="shimmer w-full h-52 rounded-xl md:w-28 md:h-20 md:rounded-none shrink-0" />
                      <div className="w-full flex-1 space-y-3 md:space-y-2.5">
                        <div className="h-6 md:h-4 bg-[#E3DFD6] rounded-md" style={{ width: `${60 + n * 10}%` }} />
                        <div className="h-4 md:h-3 w-24 md:w-16 bg-[#ECE8DF] rounded-md" />
                        <div className="h-4 md:h-3 bg-[#ECE8DF] rounded-md w-full" />
                        <div className="h-4 md:h-3 bg-[#ECE8DF] rounded-md w-5/6" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div role="alert" className="py-3 px-4 bg-red-50 border-l-2 border-red-300">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* Insight */}
              {result.travelInsight && (
                <div className="py-4 px-5 border-l border-[#D4D0C8]">
                  <p className="font-serif text-lg md:text-[13px] text-[#3A3935] md:text-[#1A1A1A]/70 italic leading-normal md:leading-relaxed">
                    {result.travelInsight}
                  </p>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <h2 className="text-[15px] font-semibold md:font-normal md:text-[11px] md:tracking-[0.2em] md:uppercase text-[#1A1A1A] md:text-[#1A1A1A]/70 mb-4">
                  {t("discover.pickedForYou")}
                </h2>

                <div className="space-y-0">
                  {result.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className={`py-6 md:py-5 group ${i > 0 ? "border-t border-[#D4D0C8]/50 md:border-[#D4D0C8]" : "border-t border-[#D4D0C8]"}`}
                    >
                      <div className="flex flex-col md:flex-row items-start gap-3 md:gap-4">
                        {/* Thumbnail */}
                        <div className="shrink-0 w-full h-52 rounded-xl md:rounded-none md:w-28 md:h-20 relative overflow-hidden bg-[#D4D0C8]/20">
                          {photos[i] ? (
                            <Image
                              src={photos[i].url || photos[i].thumbUrl}
                              alt={photos[i].altDescription || rec.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 112px"
                              quality={90}
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full animate-pulse bg-[#D4D0C8]/30" />
                          )}
                          {rec.fromBucketList && (
                            <span className="md:hidden absolute left-3 top-3 rounded-full bg-[#F7F5F0] px-2.5 py-1.5 text-[13px] font-medium text-[#1A1A1A]">
                              {t("discover.fromYourList")}
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 md:flex md:items-start md:justify-between md:gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2 flex-wrap">
                              <h3 className="font-serif text-2xl md:text-base leading-tight md:leading-tight text-balance">
                                <a
                                  href={googleSearchUrl(rec.name, rec.country)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hidden md:inline-flex hover:text-[#1A1A1A]/60 transition-colors items-start gap-1.5 group/link"
                                >
                                  {rec.name}
                                  <ExternalLink size={10} className="shrink-0 mt-1 opacity-0 group-hover/link:opacity-40 transition-opacity" />
                                </a>
                                <span className="md:hidden">{rec.name}</span>
                              </h3>
                              {rec.fromBucketList && (
                                <span className="hidden md:inline-block shrink-0 mt-0.5 text-[11px] tracking-[0.1em] uppercase bg-[#EBCFBE] text-[#1A1A1A] px-2 py-0.5">
                                  {t("discover.inYourList")}
                                </span>
                              )}
                            </div>
                            <p className="text-[15px] md:text-xs text-[#5C5A55] md:text-[#1A1A1A]/70 mt-1 md:mt-0.5">
                              {rec.country}
                            </p>
                            <p className={`text-base md:text-xs text-[#3A3935] md:text-[#1A1A1A]/70 mt-3 md:mt-2 leading-normal md:leading-relaxed ${expanded.has(i) ? "" : "line-clamp-3 md:line-clamp-2"}`}>
                              {rec.description}
                            </p>
                            {rec.description.length > 140 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpanded((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(i)) next.delete(i);
                                    else next.add(i);
                                    return next;
                                  })
                                }
                                aria-expanded={expanded.has(i)}
                                className="md:hidden min-h-[44px] text-[15px] font-medium underline underline-offset-4 text-[#1A1A1A]"
                              >
                                {expanded.has(i) ? t("discover.showLess") : t("discover.readMore")}
                              </button>
                            )}

                            {/* Trip facts — labelled grid on mobile */}
                            <dl className="md:hidden grid grid-cols-2 gap-x-4 gap-y-3 mt-3 py-3 border-y border-[#D4D0C8]">
                              <div className="col-span-2">
                                <dt className="text-[13px] text-[#5C5A55]">{t("discover.bestMonths")}</dt>
                                <dd className="text-base font-medium">{rec.bestMonths}</dd>
                              </div>
                              <div>
                                <dt className="text-[13px] text-[#5C5A55]">{t("discover.length")}</dt>
                                <dd className="text-base font-medium">{rec.estimatedDays} {t("discover.days_label")}</dd>
                              </div>
                              <div>
                                <dt className="text-[13px] text-[#5C5A55]">{t("discover.budget")}</dt>
                                <dd className="text-base font-medium">{rec.estimatedBudget}</dd>
                              </div>
                            </dl>

                            {/* Trip facts — compact row on desktop */}
                            <div className="hidden md:flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
                              <span className="text-[11px] tracking-[0.05em] text-[#1A1A1A]/70">
                                {rec.bestMonths}
                              </span>
                              <span className="text-[11px] text-[#1A1A1A]/30" aria-hidden>·</span>
                              <span className="text-[11px] tracking-[0.05em] text-[#1A1A1A]/70">
                                {rec.estimatedDays}d
                              </span>
                              <span className="text-[11px] text-[#1A1A1A]/30" aria-hidden>·</span>
                              <span className="text-[11px] tracking-[0.05em] text-[#1A1A1A]/70">
                                {rec.estimatedBudget}
                              </span>
                            </div>

                            {/* Mobile actions — full-width save + search link */}
                            <div className="mt-4 flex gap-2 md:hidden">
                              {rec.fromBucketList ? (
                                <Link
                                  href="/bucket-list?tab=wishlist"
                                  className="flex-1 h-12 inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#D4D0C8] text-base font-medium text-[#1A1A1A]"
                                >
                                  {t("discover.onYourList")}
                                  <ArrowRight size={16} aria-hidden />
                                </Link>
                              ) : addedToList.has(i) ? (
                                  <Link
                                    href="/bucket-list?tab=wishlist"
                                    className="flex-1 h-12 inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#EBCFBE] text-base font-medium text-[#1A1A1A]"
                                  >
                                    <Check size={18} aria-hidden />
                                    {t("discover.savedViewWishlist")}
                                  </Link>
                                ) : (
                                  <button
                                    onClick={() => addToBucketList(rec, i)}
                                    disabled={addingToList.has(i)}
                                    className="flex-1 h-12 inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#1A1A1A] text-base font-medium text-white disabled:opacity-60 transition-opacity"
                                  >
                                    <BookmarkPlus size={18} aria-hidden />
                                    {addingToList.has(i) ? t("discover.savingToWishlist") : t("discover.saveToWishlist")}
                                  </button>
                                )}
                              <a
                                href={googleSearchUrl(rec.name, rec.country)}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={t("discover.searchGoogle")}
                                className="w-12 h-12 shrink-0 inline-flex items-center justify-center rounded-[10px] border border-[#D4D0C8] text-[#1A1A1A]"
                              >
                                <ExternalLink size={18} aria-hidden />
                              </a>
                            </div>
                          </div>

                          {/* Desktop-only action button */}
                          {!rec.fromBucketList && (
                            <div className="hidden md:block shrink-0 self-center">
                              {addedToList.has(i) ? (
                                <Link
                                  href="/bucket-list?tab=wishlist"
                                  className="min-h-[44px] md:min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 text-[11px] tracking-[0.15em] uppercase border border-[#EBCFBE] bg-[#EBCFBE] text-[#1A1A1A]/70 hover:bg-[#EBCFBE]/80 transition-all"
                                >
                                  <ArrowRight size={10} />
                                  {t("discover.wishlisted")}
                                </Link>
                              ) : (
                                <button
                                  onClick={() => addToBucketList(rec, i)}
                                  disabled={addingToList.has(i)}
                                  className={`min-h-[44px] md:min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 text-[11px] tracking-[0.15em] uppercase border transition-all ${
                                    addingToList.has(i)
                                      ? "border-[#D4D0C8] text-[#1A1A1A]/30 animate-pulse"
                                      : "border-[#D4D0C8] text-[#1A1A1A]/70 hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
                                  }`}
                                >
                                  <BookmarkPlus size={10} />
                                  {addingToList.has(i) ? t("discover.adding") : t("discover.save")}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                    </div>
                  </div>
                  ))}
                </div>
              </div>

              {/* Footer actions */}
              <div className="border-t border-[#D4D0C8]/50 md:border-[#D4D0C8] pt-5 flex flex-col md:flex-row gap-2 md:gap-4">
                <button
                  onClick={handleDiscover}
                  disabled={loading}
                  className="min-h-[48px] md:min-h-[44px] w-full md:w-auto inline-flex items-center justify-center border border-[#D4D0C8] px-5 py-3 md:py-2.5 text-sm md:text-[11px] tracking-[0.1em] md:tracking-[0.2em] uppercase text-[#1A1A1A]/70 hover:border-[#1A1A1A]/30 hover:text-[#1A1A1A] transition-colors"
                >
                  {t("discover.discoverMore")}
                </button>
                <button
                  onClick={() => router.push("/bucket-list?tab=wishlist")}
                  className="min-h-[48px] md:min-h-[44px] inline-flex items-center justify-center gap-2 px-3 text-sm md:text-[11px] tracking-[0.1em] md:tracking-[0.15em] uppercase text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors"
                >
                  {t("discover.viewBucketList")}
                  <ArrowRight size={10} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
