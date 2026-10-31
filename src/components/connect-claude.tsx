"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

type Status = { connected: boolean; createdAt?: string; lastUsedAt?: string | null };

function formatDate(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null;
}

export default function ConnectClaude() {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/mcp-token");
      if (!res.ok) throw new Error();
      setStatus(await res.json());
    } catch {
      setFailed(true);
    }
  }

  useEffect(() => { load(); }, []);

  async function create() {
    setBusy(true); setFailed(false); setCopied(false);
    try {
      const res = await fetch("/api/mcp-token", { method: "POST" });
      if (!res.ok) throw new Error();
      const { token } = await res.json();
      setLink(`${window.location.origin}/api/mcp/${token}`);
      await load();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true); setFailed(false);
    try {
      const res = await fetch("/api/mcp-token", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLink(null);
      await load();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  const primaryBtn =
    "inline-flex items-center justify-center min-h-[44px] bg-[#1A1A1A] text-white px-6 py-3 text-xs tracking-[0.2em] uppercase hover:bg-[#1A1A1A]/85 transition-colors disabled:opacity-50";
  const secondaryBtn =
    "inline-flex items-center justify-center min-h-[44px] border border-[#D4D0C8] px-6 py-3 text-xs tracking-[0.2em] uppercase text-[#1A1A1A]/70 hover:border-[#1A1A1A]/30 hover:text-[#1A1A1A] transition-colors disabled:opacity-50";

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

      {/* Status */}
      <div className="border border-[#D4D0C8] bg-white px-5 py-4 mb-8" aria-live="polite">
        {status === null && !failed ? (
          <div className="w-5 h-5 border-2 border-[#D4D0C8] border-t-[#1A1A1A] rounded-full animate-spin" />
        ) : (
          <>
            <p className="text-xs tracking-[0.15em] uppercase flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status?.connected ? "bg-[#7A9E7E]" : "bg-[#D4D0C8]"}`} />
              {status?.connected ? t("mcp.statusOn") : t("mcp.statusOff")}
            </p>
            {status?.connected && (
              <p className="text-xs text-[#1A1A1A]/60 mt-2">
                {t("mcp.created")}: {formatDate(status.createdAt)} · {t("mcp.lastUsed")}: {formatDate(status.lastUsedAt) ?? t("mcp.never")}
              </p>
            )}
          </>
        )}
      </div>

      {/* New link, shown once */}
      {link && (
        <div className="border border-[#EBCFBE] bg-[#FBF6F2] px-5 py-5 mb-8">
          <p className="font-serif text-lg mb-2">{t("mcp.yourLink")}</p>
          <div className="flex gap-2 items-stretch">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              aria-label={t("mcp.yourLink")}
              className="flex-1 min-w-0 bg-white border border-[#D4D0C8] px-3 py-2 text-xs font-mono"
            />
            <button onClick={copy} className={primaryBtn}>
              {copied ? t("mcp.copied") : t("mcp.copy")}
            </button>
          </div>
          <p className="text-xs text-[#1A1A1A]/70 mt-3 leading-relaxed">{t("mcp.onceWarning")}</p>

          <p className="font-serif text-lg mt-6 mb-3">{t("mcp.stepsHeading")}</p>
          <ol className="space-y-2 text-sm text-[#1A1A1A]/70 leading-relaxed">
            {[t("mcp.step1"), t("mcp.step2"), t("mcp.step3")].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-serif text-[#C9A28A] shrink-0">0{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {failed && <p role="alert" className="text-sm text-[#B5543C] mb-6">{t("mcp.error")}</p>}

      {/* Actions */}
      {status && (
        <div className="flex flex-wrap gap-4">
          <button onClick={create} disabled={busy} className={primaryBtn}>
            {status.connected ? t("mcp.replace") : t("mcp.create")}
          </button>
          {status.connected && (
            <button onClick={disconnect} disabled={busy} className={secondaryBtn}>
              {t("mcp.disconnect")}
            </button>
          )}
        </div>
      )}
      {status?.connected && !link && (
        <p className="text-xs text-[#1A1A1A]/55 mt-3">{t("mcp.replaceNote")}</p>
      )}
    </div>
  );
}
