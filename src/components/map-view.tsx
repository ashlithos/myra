"use client";

import { useEffect, useState, useMemo } from "react";
import type { Experience } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import dynamic from "next/dynamic";

const MapInner = dynamic(() => import("./map-inner"), { ssr: false });

interface Pin {
  id: number;
  name: string;
  city: string | null;
  country: string;
  status: string;
  lat: number;
  lng: number;
}

// Simple geocoding cache
const geoCache = new Map<string, { lat: number; lng: number } | null>();

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  if (geoCache.has(query)) return geoCache.get(query)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { "User-Agent": "Myra Travel Planner" } }
    );
    const data = await res.json();
    if (data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geoCache.set(query, result);
      return result;
    }
    geoCache.set(query, null);
    return null;
  } catch {
    return null;
  }
}

const STATUS_STYLES = {
  wishlist: { color: "#1A1A1A", fillColor: "transparent", fillOpacity: 0, weight: 1.5 },
  planned: { color: "#EBCFBE", fillColor: "#EBCFBE", fillOpacity: 0.8, weight: 1.5 },
  visited: { color: "#1A1A1A", fillColor: "#1A1A1A", fillOpacity: 0.8, weight: 1.5 },
};

export default function MapView({ experiences }: { experiences: Experience[] }) {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    let cancelled = false;

    async function geocodeAll() {
      setLoading(true);
      const results: Pin[] = [];

      for (const exp of experiences) {
        if (cancelled) break;
        const query = [exp.city, exp.country].filter(Boolean).join(", ");
        if (!query) continue;
        const cached = geoCache.has(query);
        const coords = await geocode(query);
        if (coords) {
          results.push({
            id: exp.id,
            name: exp.name,
            city: exp.city,
            country: exp.country,
            status: exp.status,
            ...coords,
          });
        }
        // Small delay between uncached requests to be nice to Nominatim
        if (!cached) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      if (!cancelled) {
        setPins(results);
        setLoading(false);
      }
    }

    geocodeAll();
    return () => { cancelled = true; };
  }, [experiences]);

  const legend = useMemo(() => [
    { status: "wishlist", label: t("bucket.wishlist") },
    { status: "planned", label: t("bucket.planned") },
    { status: "visited", label: t("bucket.visited") },
  ], [t]);

  return (
    <div className="relative">
      <div className="w-full h-[400px] md:h-[500px] border border-[#D4D0C8] overflow-hidden relative">
        {loading && pins.length === 0 && (
          <div className="absolute inset-0 z-[1000] bg-[#F7F5F0]/80 flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-[#D4D0C8] border-t-[#1A1A1A] rounded-full animate-spin" />
            <p className="text-[10px] tracking-[0.15em] uppercase text-[#1A1A1A]/70">
              {t("map.loading")}
            </p>
          </div>
        )}
        <MapInner pins={pins} viewLabel={t("map.viewPin")} />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 justify-end">
        {legend.map(({ status, label }) => {
          const style = STATUS_STYLES[status as keyof typeof STATUS_STYLES];
          return (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-full border-[1.5px]"
                style={{
                  borderColor: style.color,
                  backgroundColor: style.fillOpacity > 0 ? style.fillColor : "transparent",
                }}
              />
              <span className="text-[9px] tracking-[0.1em] uppercase text-[#1A1A1A]/70">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
