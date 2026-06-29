"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function ExperiencePageHeader({
  mode,
  name,
  returnTab,
}: {
  mode: "new" | "edit";
  name?: string;
  returnTab?: string;
}) {
  const { t } = useI18n();
  const backHref = returnTab ? `/bucket-list?tab=${returnTab}` : "/bucket-list";

  return (
    <div className="mb-12">
      <Link
        href={backHref}
        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-lg text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors -ml-2"
        aria-label={mode === "new" ? t("newExp.back") : t("editExp.back")}
      >
        &larr;
      </Link>
      {mode === "new" && (
        <h1 className="font-serif text-3xl mt-6">
          {t("newExp.heading")}
        </h1>
      )}
    </div>
  );
}
