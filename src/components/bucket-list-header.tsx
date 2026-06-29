"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function BucketListHeader() {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-between mb-10">
      <div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#1A1A1A]/70 mb-2">
          {t("bucket.archive")}
        </p>
        <h1 className="font-serif text-3xl">{t("bucket.title")}</h1>
      </div>
      <Link
        href="/bucket-list/new"
        className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-6 py-3 text-[10px] tracking-[0.2em] uppercase hover:bg-[#1A1A1A]/80 transition-colors"
      >
        <Plus size={14} />
        {t("bucket.addExperience")}
      </Link>
    </div>
  );
}
