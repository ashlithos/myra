"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { SEASONS, PARTNER_TYPES, STATUSES, DO_BY_AGES } from "@/lib/types";
import { parseCommaSeparated, toCommaSeparated } from "@/lib/utils";
import type { Experience, ExperiencePhoto } from "@/lib/types";
import PhotoPicker from "./photo-picker";
import { Sparkles, X, ImagePlus } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type PendingPhoto = Omit<ExperiencePhoto, "id" | "experienceId">;

export default function ExperienceForm({
  experience,
  returnTab,
}: {
  experience?: Experience;
  returnTab?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = !!experience;
  const { t } = useI18n();

  const [name, setName] = useState(experience?.name || searchParams.get("name") || "");
  const [description, setDescription] = useState(experience?.description || "");
  const [country, setCountry] = useState(experience?.country || searchParams.get("country") || "");
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(
    experience ? parseCommaSeparated(experience.idealSeasons) : []
  );
  const [selectedPartnerTypes, setSelectedPartnerTypes] = useState<string[]>(
    experience ? parseCommaSeparated(experience.idealPartnerTypes) : []
  );
  const [doByAge, setDoByAge] = useState(experience?.doByAge || "");
  const [status, setStatus] = useState(experience?.status || "wishlist");
  const [saving, setSaving] = useState(false);

  // AI suggestions — initialize from saved data if available
  const hasSavedPlan = !!(experience?.bestMonths || experience?.estimatedDays || experience?.estimatedBudget);
  const [fetchingSuggestion, setFetchingSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    bestMonths?: string;
    tip?: string;
    idealSeasons?: string[];
    country?: string;
    estimatedDays?: number;
    estimatedBudget?: string;
  } | null>(hasSavedPlan ? {
    bestMonths: experience?.bestMonths || undefined,
    estimatedDays: experience?.estimatedDays || undefined,
    estimatedBudget: experience?.estimatedBudget || undefined,
  } : null);
  const [suggestionAccepted, setSuggestionAccepted] = useState(hasSavedPlan);

  // Photo state
  const [photos, setPhotos] = useState<ExperiencePhoto[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState("");

  // Load existing photos when editing
  useEffect(() => {
    if (isEdit) {
      fetch(`/api/experiences/${experience.id}/photos`)
        .then((res) => res.json())
        .then((data) => setPhotos(data));
    }
  }, [isEdit, experience?.id]);

  // Auto-fetch photo when name is prefilled (e.g. from suggestion chips)
  useEffect(() => {
    const prefilled = searchParams.get("name");
    if (prefilled && !isEdit && photos.length === 0 && pendingPhotos.length === 0) {
      autoFetchPhoto(prefilled);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleItem(arr: string[], item: string): string[] {
    return arr.includes(item)
      ? arr.filter((i) => i !== item)
      : [...arr, item];
  }

  async function handleAISuggest() {
    if (!name.trim()) return;
    setFetchingSuggestion(true);
    setSuggestion(null);
    setSuggestionAccepted(false);

    try {
      const res = await fetch("/api/ai/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuggestion(data);
    } catch {
      // Silently fail
    }

    setFetchingSuggestion(false);
  }

  function acceptSuggestion() {
    if (!suggestion) return;
    if (suggestion.idealSeasons && selectedSeasons.length === 0)
      setSelectedSeasons(suggestion.idealSeasons);
    if (suggestion.country && !country)
      setCountry(suggestion.country);
    setSuggestionAccepted(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name,
      description: description.trim() || null,
      city: null,
      country: country || "",
      idealSeasons: toCommaSeparated(selectedSeasons),
      idealPartnerTypes: toCommaSeparated(selectedPartnerTypes),
      estimatedDays: suggestionAccepted ? (suggestion?.estimatedDays ?? null) : (experience?.estimatedDays ?? null),
      bestMonths: suggestionAccepted ? (suggestion?.bestMonths ?? null) : (experience?.bestMonths ?? null),
      estimatedBudget: suggestionAccepted ? (suggestion?.estimatedBudget ?? null) : (experience?.estimatedBudget ?? null),
      doByAge: doByAge || null,
      status,
    };

    const url = isEdit
      ? `/api/experiences/${experience.id}`
      : "/api/experiences";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Failed to save";
        try { const err = await res.json(); msg = err.error || msg; } catch {}
        throw new Error(msg);
      }

      const saved = await res.json();
      const expId = isEdit ? experience.id : saved.id;

      // Save pending photos
      for (const photo of pendingPhotos) {
        await fetch(`/api/experiences/${expId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(photo),
        });
      }

      router.refresh();
      router.push(`/bucket-list?tab=${status}`);
    } catch (err) {
      setSaving(false);
      alert(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    setSaving(true);
    await fetch(`/api/experiences/${experience.id}`, { method: "DELETE" });
    // Show snackbar via URL param so it displays on the bucket list page
    router.push(`/bucket-list?tab=${status}&deleted=1`);
    router.refresh();
  }

  function addPhoto(photo: PendingPhoto) {
    // Replace any existing photos with the new one
    setPhotos([]);
    setPendingPhotos([photo]);
    setShowPhotoPicker(false);
  }

  async function removeExistingPhoto(photoId: number) {
    if (!isEdit) return;
    await fetch(
      `/api/experiences/${experience.id}/photos?photoId=${photoId}`,
      { method: "DELETE" }
    );
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  function removePendingPhoto(unsplashId: string) {
    setPendingPhotos((prev) => prev.filter((p) => p.unsplashId !== unsplashId));
  }

  // Auto-fetch a photo when user finishes typing the name
  async function autoFetchPhoto(experienceName: string) {
    if (!experienceName.trim()) return;
    if (photos.length > 0 || pendingPhotos.length > 0) return;
    try {
      const res = await fetch(`/api/photos/search?query=${encodeURIComponent(experienceName)}`);
      const data = await res.json();
      if (data.length > 0) {
        setPendingPhotos([data[0]]);
      }
    } catch {
      // Silently fail
    }
  }

  const allPhotos = [
    ...photos.map((p) => ({ ...p, isPending: false as const })),
    ...pendingPhotos.map((p) => ({ ...p, id: 0, experienceId: 0, isPending: true as const })),
  ];

  const labelClass = "text-xs md:text-[10px] tracking-[0.2em] uppercase text-[#1A1A1A]/70 mb-1.5 md:mb-1 block";
  const backHref = returnTab ? `/bucket-list?tab=${returnTab}` : "/bucket-list";

  return (
    <div>
      {/* Banner photo — full viewport width, breaking out of container and top padding */}
      <div className="relative -mt-10" style={{ marginLeft: "calc(-50vw + 50%)", marginRight: "calc(-50vw + 50%)", width: "100vw" }}>
        {allPhotos.length > 0 ? (
          <div className="relative w-full h-48 md:h-64 lg:h-72 group">
            <Image
              src={allPhotos[0].url.replace(/w=\d+/, "w=2400")}
              alt={allPhotos[0].altDescription || name || "Cover photo"}
              fill
              className="object-cover"
              sizes="100vw"
              priority
              unoptimized
            />
            {/* Gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#F7F5F0] via-transparent to-transparent" />

            {/* Change cover button */}
            <button
              type="button"
              onClick={() => setShowPhotoPicker(!showPhotoPicker)}
              className="absolute bottom-3 right-3 md:bottom-4 md:right-4 inline-flex items-center justify-center gap-1.5 min-h-[44px] bg-white/80 backdrop-blur-sm border border-[#D4D0C8] px-3 py-2 text-[10px] tracking-[0.12em] uppercase text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-white transition-all opacity-100 md:opacity-60 md:group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ImagePlus size={12} />
              {t("form.changeCover")}
            </button>

            {/* Photographer credit */}
            <a
              href={allPhotos[0].photographerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 left-3 md:bottom-4 md:left-4 inline-flex items-center min-h-[44px] px-3 text-[8px] text-white/85 hover:text-white transition-colors"
            >
              {allPhotos[0].photographerName}
            </a>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPhotoPicker(!showPhotoPicker)}
            className="w-full h-32 md:h-40 bg-[#F0EDE6] hover:bg-[#EAE6DD] transition-colors flex items-center justify-center gap-2 text-[#1A1A1A]/45 hover:text-[#1A1A1A]/60 group"
          >
            <ImagePlus size={18} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] tracking-[0.15em] uppercase">{t("form.addCover")}</span>
          </button>
        )}

        {/* Back arrow overlay */}
        <Link
          href={backHref}
          className="absolute top-3 left-3 md:top-4 md:left-4 inline-flex items-center justify-center min-w-[44px] min-h-[44px] w-10 h-10 text-lg rounded-full bg-white/70 backdrop-blur-sm text-[#1A1A1A]/70 hover:text-[#1A1A1A] hover:bg-white transition-all"
          aria-label={isEdit ? t("editExp.back") : t("newExp.back")}
        >
          &larr;
        </Link>
      </div>

      {/* Photo picker modal */}
      {showPhotoPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowPhotoPicker(false)}>
          <div className="bg-[#F7F5F0] w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <PhotoPicker
              initialQuery={[name, country].filter(Boolean).join(" ")}
              onSelect={addPhoto}
              onClose={() => setShowPhotoPicker(false)}
            />
          </div>
        </div>
      )}

      {/* Form content */}
      <form onSubmit={handleSubmit} className="max-w-xl space-y-8 mt-6">
        {/* Name — hero field */}
        <div>
          <label htmlFor="experience-name" className="sr-only">{t("form.nameLabel")}</label>
          <input
            id="experience-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => autoFetchPhoto(name)}
            placeholder={t("form.namePlaceholder")}
            className="w-full bg-transparent border-none min-h-[44px] py-2 font-serif text-3xl md:text-4xl placeholder:text-[#1A1A1A]/45 leading-tight"
            required
          />
          <div className="h-px bg-[#1A1A1A]/10 mt-1" />
        </div>

        {/* Description — optional motivation */}
        <div>
          <label htmlFor="experience-desc" className="text-[11px] md:text-[9px] tracking-[0.1em] uppercase text-[#1A1A1A]/70 mb-2 block">
            {t("form.descLabel")}
          </label>
          <textarea
            id="experience-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("form.descPlaceholder")}
            rows={2}
            className="w-full bg-transparent border-none py-2 text-sm placeholder:text-[#1A1A1A]/45 leading-relaxed resize-none"
          />
          <div className="h-px bg-[#1A1A1A]/10" />
        </div>

        {/* Status toggle */}
        <div>
          <label className={labelClass}>&#9632; {t("form.status")}</label>
            <div className="flex gap-1 mt-2" role="group" aria-label="Status">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                  className={`inline-flex items-center justify-center min-h-[44px] md:min-h-[36px] px-4 py-3 md:py-2 text-xs md:text-[10px] tracking-[0.15em] uppercase border transition-colors ${
                    status === s
                      ? "bg-[#EBCFBE] text-[#1A1A1A] border-[#EBCFBE]"
                      : "border-[#D4D0C8] text-[#1A1A1A]/70 hover:border-[#1A1A1A]/30"
                  }`}
                >
                  {t(`formStatus.${s}` as any)}
                </button>
              ))}
            </div>
        </div>

        {/* AI Quick Suggest */}
        <div>
            {!suggestion && !fetchingSuggestion && (
              <button
                type="button"
                onClick={handleAISuggest}
                disabled={!name.trim()}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3 text-[10px] tracking-[0.12em] uppercase text-[#1A1A1A]/70 hover:text-[#1A1A1A]/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Sparkles size={12} />
                {t("form.aiSuggest")}
              </button>
            )}
            {fetchingSuggestion && (
              <div className="flex items-center gap-2 py-3 px-4 border border-[#D4D0C8]/50 bg-[#F7F5F0]">
                <div className="w-3 h-3 border border-[#D4D0C8] border-t-[#1A1A1A]/40 rounded-full animate-spin" />
                <span className="text-[10px] tracking-[0.1em] uppercase text-[#1A1A1A]/70">{t("form.aiThinking")}</span>
              </div>
            )}
            {suggestion && !suggestionAccepted && (
              <div className="py-3 px-4 border border-[#EBCFBE]/50 bg-[#EBCFBE]/5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] tracking-[0.1em] uppercase text-[#1A1A1A]/70 flex items-center gap-1">
                    <Sparkles size={10} />
                    {t("form.aiSuggestion")}
                  </p>
                  <button type="button" onClick={() => setSuggestion(null)} aria-label="Dismiss suggestion" className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-[#1A1A1A]/45 hover:text-[#1A1A1A]/60">
                    <X size={12} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {suggestion.bestMonths && (
                    <p className="text-xs text-[#1A1A1A]/60">
                      <span className="text-[#1A1A1A]/70">{t("form.aiBestTime")}</span> {suggestion.bestMonths}
                    </p>
                  )}
                  {suggestion.estimatedDays && (
                    <p className="text-xs text-[#1A1A1A]/60">
                      <span className="text-[#1A1A1A]/70">{t("form.aiDays")}</span> {suggestion.estimatedDays} days
                    </p>
                  )}
                  {suggestion.estimatedBudget && (
                    <p className="text-xs text-[#1A1A1A]/60">
                      <span className="text-[#1A1A1A]/70">{t("form.aiBudget")}</span> {suggestion.estimatedBudget}
                    </p>
                  )}
                </div>
                {suggestion.tip && (
                  <p className="text-xs text-[#1A1A1A]/70 italic">{suggestion.tip}</p>
                )}
                <button
                  type="button"
                  onClick={acceptSuggestion}
                  className="inline-flex items-center justify-center min-h-[44px] text-[10px] tracking-[0.12em] uppercase text-[#1A1A1A]/70 hover:text-[#1A1A1A] border border-[#D4D0C8] px-3 py-1.5 transition-colors"
                >
                  {t("form.aiAccept")}
                </button>
              </div>
            )}
            {suggestionAccepted && suggestion && (
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles size={10} className="text-[#1A1A1A]/60" />
                {suggestion.bestMonths && (
                  <span className="group/chip inline-flex items-center gap-1 text-[10px] tracking-[0.08em] bg-[#EBCFBE]/20 text-[#1A1A1A]/70 px-2.5 py-1 border border-[#EBCFBE]/30">
                    {suggestion.bestMonths}
                    <button
                      type="button"
                      onClick={() => setSuggestion({ ...suggestion, bestMonths: undefined })}
                      aria-label="Remove best months"
                      className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] opacity-60 group-hover/chip:opacity-100 focus-visible:opacity-100 transition-opacity text-[#1A1A1A]/70 hover:text-[#1A1A1A]/60 -mr-1"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )}
                {suggestion.estimatedDays && (
                  <span className="group/chip inline-flex items-center gap-1 text-[10px] tracking-[0.08em] bg-[#EBCFBE]/20 text-[#1A1A1A]/70 px-2.5 py-1 border border-[#EBCFBE]/30">
                    {suggestion.estimatedDays} {t("form.aiDaysUnit")}
                    <button
                      type="button"
                      onClick={() => setSuggestion({ ...suggestion, estimatedDays: undefined })}
                      aria-label="Remove estimated days"
                      className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] opacity-60 group-hover/chip:opacity-100 focus-visible:opacity-100 transition-opacity text-[#1A1A1A]/70 hover:text-[#1A1A1A]/60 -mr-1"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )}
                {suggestion.estimatedBudget && (
                  <span className="group/chip inline-flex items-center gap-1 text-[10px] tracking-[0.08em] bg-[#EBCFBE]/20 text-[#1A1A1A]/70 px-2.5 py-1 border border-[#EBCFBE]/30">
                    {suggestion.estimatedBudget}
                    <button
                      type="button"
                      onClick={() => setSuggestion({ ...suggestion, estimatedBudget: undefined })}
                      aria-label="Remove estimated budget"
                      className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] opacity-60 group-hover/chip:opacity-100 focus-visible:opacity-100 transition-opacity text-[#1A1A1A]/70 hover:text-[#1A1A1A]/60 -mr-1"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => { setSuggestionAccepted(false); setSuggestion(null); handleAISuggest(); }}
                  className="inline-flex items-center justify-center gap-1 min-w-[44px] min-h-[44px] text-[10px] tracking-[0.08em] text-[#1A1A1A]/70 hover:text-[#1A1A1A]/60 transition-colors"
                  title={t("form.aiRefresh")}
                  aria-label={t("form.aiRefresh")}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3.2-6.87" /><polyline points="21 3 21 9 15 9" /></svg>
                </button>
              </div>
            )}
        </div>

        <div className="border-t border-[#D4D0C8]/50 md:border-[#D4D0C8] pt-6 flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center min-h-[44px] md:min-h-[36px] bg-[#1A1A1A] text-white px-8 py-3.5 md:py-3 text-xs md:text-[10px] tracking-[0.2em] uppercase hover:bg-[#1A1A1A]/80 transition-colors disabled:opacity-50"
          >
            {saving ? t("form.saving") : isEdit ? t("form.update") : t("form.addToList")}
          </button>

          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="inline-flex items-center justify-center min-h-[44px] px-3 text-xs md:text-[10px] tracking-[0.15em] uppercase text-[#1A1A1A]/70 hover:text-red-500 transition-colors py-2"
            >
              {t("form.delete")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
