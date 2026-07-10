"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { ExperiencePhoto } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

type UnsplashResult = Omit<ExperiencePhoto, "id" | "experienceId">;

export default function PhotoPicker({
  initialQuery,
  onSelect,
  onClose,
}: {
  initialQuery: string;
  onSelect: (photo: UnsplashResult) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<UnsplashResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { t } = useI18n();

  const searchPhotos = async (q: string, pageNum = 1, append = false) => {
    if (!q.trim()) return;
    if (append) setLoadingMore(true); else setLoading(true);
    const res = await fetch(`/api/photos/search?query=${encodeURIComponent(q)}&page=${pageNum}`);
    const data = await res.json();
    setResults((prev) => append ? [...prev, ...data] : data);
    setHasMore(data.length >= 9);
    setPage(pageNum);
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    if (initialQuery) {
      searchPhotos(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  return (
    <div className="border border-[#D4D0C8] bg-white p-6 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] tracking-[0.2em] uppercase text-[#1A1A1A]/70">
          {t("photos.title")}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center min-h-[44px] px-3 text-[10px] tracking-[0.15em] uppercase text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors"
        >
          {t("photos.close")}
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchPhotos(query, 1))}
          placeholder={t("photos.searchPlaceholder")}
          aria-label="Search photos"
          className="flex-1 bg-transparent border-b border-[#D4D0C8] min-h-[44px] py-2 text-sm focus:border-[#1A1A1A] transition-colors placeholder:text-[#1A1A1A]/45"
        />
        <button
          type="button"
          onClick={() => searchPhotos(query, 1)}
          className="inline-flex items-center justify-center min-h-[44px] md:min-h-[44px] border border-[#D4D0C8] px-4 py-3 md:py-2 text-[10px] tracking-[0.15em] uppercase text-[#1A1A1A]/70 hover:border-[#1A1A1A]/30 transition-colors"
        >
          {t("photos.search")}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[#1A1A1A]/70 italic py-8 text-center">
          {t("photos.searching")}
        </p>
      ) : results.length === 0 ? (
        <p className="text-sm text-[#1A1A1A]/70 italic py-8 text-center">
          {t("photos.noResults")}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {results.map((photo, i) => (
              <button
                key={`${photo.unsplashId}-${i}`}
                type="button"
                onClick={() => onSelect(photo)}
                className="relative aspect-[3/2] overflow-hidden group"
              >
                <Image
                  src={photo.thumbUrl}
                  alt={photo.altDescription || "Travel photo"}
                  fill
                  className="object-cover group-hover:opacity-80 transition-opacity"
                  sizes="200px"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end">
                  <span className="text-[8px] text-white/0 group-hover:text-white/85 px-2 py-1 transition-colors truncate w-full">
                    {photo.photographerName}
                  </span>
                </div>
              </button>
            ))}
          </div>
          {hasMore && (
            <button
              type="button"
              onClick={() => searchPhotos(query, page + 1, true)}
              disabled={loadingMore}
              className="inline-flex items-center justify-center w-full mt-3 min-h-[44px] md:min-h-[44px] py-3 md:py-2 text-[10px] tracking-[0.15em] uppercase text-[#1A1A1A]/70 hover:text-[#1A1A1A]/60 transition-colors border border-[#D4D0C8] hover:border-[#1A1A1A]/30"
            >
              {loadingMore ? t("photos.searching") : t("photos.loadMore")}
            </button>
          )}
        </>
      )}

      <p className="text-[8px] text-[#1A1A1A]/60 mt-3">
        {t("photos.attribution")}
      </p>
    </div>
  );
}
