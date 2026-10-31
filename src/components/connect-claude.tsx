"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function ConnectClaude() {
  const { t } = useI18n();
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/mcp`);
  }, []);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  const steps = [t("mcp.step1"), t("mcp.step2"), t("mcp.step3"), t("mcp.step4")];

  return (
    <div className="max-w-xl mx-auto py-16 md:py-24">
      <Link
        href="/bucket-list"
        className="text-[10px] tracking-[0.15em] uppercase text-[#1A1A1A]/55 hover:text-[#1A1A1A] transition-colors"
      >
        {t("mcp.back")}
      </Link>

      <h1 className="font-serif text-3xl md:text-4xl mt-8 mb-3">{t("mcp.heading")}</h1>
      <p className="text-sm text-[#1A1A1A]/70 leading-relaxed mb-2">{t("mcp.intro")}</p>
      <p className="text-sm text-[#1A1A1A]/55 italic leading-relaxed mb-12">{t("mcp.example")}</p>

      <div className="border border-[#EBCFBE] bg-[#FBF6F2] px-5 py-5">
        <p className="font-serif text-lg mb-2">{t("mcp.address")}</p>
        <div className="flex gap-2 items-stretch">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            aria-label={t("mcp.address")}
            className="flex-1 min-w-0 bg-white border border-[#D4D0C8] px-3 py-2 text-xs font-mono"
          />
          <button
            onClick={copy}
            className="inline-flex items-center justify-center min-h-[44px] bg-[#1A1A1A] text-white px-6 py-3 text-xs tracking-[0.2em] uppercase hover:bg-[#1A1A1A]/85 transition-colors"
          >
            {copied ? t("mcp.copied") : t("mcp.copy")}
          </button>
        </div>

        <p className="font-serif text-lg mt-6 mb-3">{t("mcp.stepsHeading")}</p>
        <ol className="space-y-2 text-sm text-[#1A1A1A]/70 leading-relaxed">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-serif text-[#C9A28A] shrink-0">0{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-[#1A1A1A]/60 mt-4 leading-relaxed">{t("mcp.privacy")}</p>
      </div>
    </div>
  );
}
