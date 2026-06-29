"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import GalleryWall, { type GalleryItem } from "@/components/gallery-wall";

function AnimatedCount({ value }: { value: number }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current || hasAnimated) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasAnimated]);

  useEffect(() => {
    if (!hasAnimated || value === 0) return;
    const duration = 800;
    const steps = Math.min(value, 30);
    const stepTime = duration / steps;
    let current = 0;
    const timer = setInterval(() => {
      current++;
      setCount(Math.round((current / steps) * value));
      if (current >= steps) clearInterval(timer);
    }, stepTime);
    return () => clearInterval(timer);
  }, [hasAnimated, value]);

  return <span ref={ref}>{hasAnimated ? count : 0}</span>;
}

export default function HomeContent({
  wishlistCount,
  plannedCount,
  visitedCount,
  galleryItems,
}: {
  wishlistCount: number;
  plannedCount: number;
  visitedCount: number;
  galleryItems?: GalleryItem[];
}) {
  const { t, lang } = useI18n();
  const isCN = lang === "zh";

  return (
    <div className="py-16 md:py-24">
      <style>{`
        @keyframes heroReveal {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .hero-reveal {
          opacity: 0;
          animation: heroReveal 700ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .hero-fade {
          opacity: 0;
          animation: heroFade 600ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-reveal, .hero-fade {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>

      {/* Hero */}
      <div className="text-center mb-20">
        <p
          className="text-xs italic text-[#1A1A1A]/70 mb-4 tracking-wide hero-fade"
          style={{ animationDelay: "100ms" }}
        >
          {t("home.quote")}
        </p>
        <h1 className="font-serif text-4xl md:text-5xl leading-tight mb-4 font-light tracking-tight">
          {isCN ? (
            <>
              <span className="inline-block hero-reveal" style={{ animationDelay: "300ms" }}>
                {t("home.heading1")}<strong>{t("home.heading2")}</strong>
              </span>
              <br />
              <span className="inline-block hero-reveal" style={{ animationDelay: "450ms" }}>
                {t("home.heading4")}<strong>{t("home.heading5")}</strong>
              </span>
            </>
          ) : (
            <>
              <span className="inline-block hero-reveal" style={{ animationDelay: "300ms" }}>
                {t("home.heading1")}
              </span>
              <br />
              <span className="inline-block hero-reveal" style={{ animationDelay: "500ms" }}>
                <em>{t("home.heading2")}</em>{t("home.heading3")}
              </span>
            </>
          )}
        </h1>
      </div>

      {/* Intent Cards — Discover first */}
      <div className="grid md:grid-cols-2 gap-3 max-w-2xl mx-auto mb-20">
        <Link
          href="/trips/new"
          className="bg-white p-5 md:p-6 rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] group hover:bg-[#EBCFBE] active:bg-[#EBCFBE] transition-colors hero-reveal"
          style={{ animationDelay: "600ms" }}
        >
          <Image
            src="/globe-icon.svg"
            alt=""
            width={44}
            height={44}
            className="mb-3 opacity-75 group-hover:opacity-100 group-active:opacity-100 transition-opacity"
            aria-hidden="true"
          />
          <h2 className="font-serif text-lg md:text-xl mb-1.5">
            {t("home.discoverTrip")}
          </h2>
          <p className="text-sm md:text-xs text-[#1A1A1A]/70 leading-relaxed">
            {t("home.discoverTripDesc")}
          </p>
        </Link>

        <Link
          href="/bucket-list/new"
          className="bg-white p-5 md:p-6 rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] group hover:bg-[#EBCFBE] active:bg-[#EBCFBE] transition-colors hero-reveal"
          style={{ animationDelay: "750ms" }}
        >
          <Image
            src="/book.svg"
            alt=""
            width={44}
            height={44}
            className="mb-3 opacity-75 group-hover:opacity-100 group-active:opacity-100 transition-opacity"
            aria-hidden="true"
          />
          <h2 className="font-serif text-lg md:text-xl mb-1.5">
            {t("home.addBucketList")}
          </h2>
          <p className="text-sm md:text-xs text-[#1A1A1A]/70 leading-relaxed">
            {t("home.addBucketListDesc")}
          </p>
        </Link>
      </div>

      {/* Gallery Wall — break out of max-w container to full viewport width */}
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen mb-20 overflow-x-clip hero-fade" style={{ animationDelay: "900ms" }}>
        <GalleryWall items={galleryItems} />
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-8 md:gap-12 text-center hero-fade" style={{ animationDelay: "1000ms" }}>
        <Link href="/bucket-list?tab=wishlist" className="group transition-transform hover:-translate-y-0.5">
          <p className="font-serif text-2xl tabular-nums group-hover:text-[#EBCFBE] transition-colors">
            <AnimatedCount value={wishlistCount} />
          </p>
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#1A1A1A]/70 mt-1">
            {t("home.wishlist")}
          </p>
        </Link>
        <div className="w-px bg-[#D4D0C8]" />
        <Link href="/bucket-list?tab=planned" className="group transition-transform hover:-translate-y-0.5">
          <p className="font-serif text-2xl tabular-nums group-hover:text-[#EBCFBE] transition-colors">
            <AnimatedCount value={plannedCount} />
          </p>
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#1A1A1A]/70 mt-1">
            {t("home.planned")}
          </p>
        </Link>
        <div className="w-px bg-[#D4D0C8]" />
        <Link href="/bucket-list?tab=visited" className="group transition-transform hover:-translate-y-0.5">
          <p className="font-serif text-2xl tabular-nums group-hover:text-[#EBCFBE] transition-colors">
            <AnimatedCount value={visitedCount} />
          </p>
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#1A1A1A]/70 mt-1">
            {t("home.visited")}
          </p>
        </Link>
      </div>
    </div>
  );
}
