"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function CardMenu({ experienceId }: { experienceId: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    await fetch(`/api/experiences/${experienceId}`, { method: "DELETE" });
    setOpen(false);
    setConfirming(false);
    router.refresh();
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
          setConfirming(false);
        }}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#1A1A1A]/40 hover:text-[#1A1A1A]/70 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        aria-label={t("menu.more")}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("menu.more")}
          className="absolute right-0 top-full mt-1 bg-white border border-[#D4D0C8] shadow-[0_2px_8px_rgba(0,0,0,0.08)] z-20 min-w-[120px]"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            className={`w-full text-left px-4 py-2.5 min-h-[44px] flex items-center text-[10px] tracking-[0.15em] uppercase transition-colors ${
              confirming
                ? "text-red-500 bg-red-50"
                : "text-[#1A1A1A]/50 hover:text-red-500 hover:bg-[#F7F5F0]"
            }`}
          >
            {confirming ? t("menu.confirm") : t("menu.delete")}
          </button>
        </div>
      )}
    </div>
  );
}
