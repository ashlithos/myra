"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function DiscoverHeader() {
  const { t } = useI18n();

  return (
    <div className="max-w-5xl mx-auto mb-6 md:mb-10">
      <Link
        href="/"
        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-lg text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors -ml-2"
        aria-label={t("discover.back")}
      >
        &larr;
      </Link>
      <p className="text-[10px] tracking-[0.3em] uppercase text-[#1A1A1A]/70 mb-1 md:mb-2 mt-3 md:mt-6">
        {t("discover.label")}
      </p>
      <h1 className="font-serif text-2xl md:text-3xl">{t("discover.heading")}</h1>
    </div>
  );
}
