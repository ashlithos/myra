"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";

export default function UserMenu() {
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    // Delay adding listener to avoid it catching the same click/tap that opened the menu
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }, 150);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  if (status === "loading") {
    return <div className="w-7 h-7 rounded-full bg-[#D4D0C8] animate-pulse" />;
  }

  if (!session?.user) {
    return (
      <button
        onClick={() => signIn("google")}
        className="inline-flex items-center min-h-[44px] md:min-h-[36px] px-3 text-[10px] md:text-xs tracking-[0.15em] text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors whitespace-nowrap py-2 md:py-0"
      >
        {t("user.signIn")}
      </button>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center justify-center min-w-[44px] min-h-[44px] gap-2 group"
      >
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt=""
            width={36}
            height={36}
            className="rounded-full opacity-70 group-hover:opacity-100 group-active:opacity-100 transition-opacity w-9 h-9 md:w-7 md:h-7"
          />
        ) : (
          <div className="w-9 h-9 md:w-7 md:h-7 rounded-full bg-[#EBCFBE] flex items-center justify-center text-xs md:text-[10px] font-medium text-[#1A1A1A]">
            {session.user.name?.[0] || "?"}
          </div>
        )}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 bg-white border border-[#D4D0C8] shadow-[0_2px_8px_rgba(0,0,0,0.08)] z-50 min-w-[160px]">
          <div className="px-4 py-3 border-b border-[#D4D0C8]/50">
            <p className="text-xs font-medium text-[#1A1A1A] truncate">{session.user.name}</p>
            <p className="text-[10px] text-[#1A1A1A]/70 truncate mt-0.5">{session.user.email}</p>
          </div>
          <button
            role="menuitem"
            onClick={() => { setOpen(false); signOut(); }}
            className="flex items-center w-full text-left min-h-[44px] md:min-h-[36px] px-4 py-3 md:py-2.5 text-[10px] tracking-[0.15em] uppercase text-[#1A1A1A]/70 hover:text-[#1A1A1A] hover:bg-[#F7F5F0] transition-colors"
          >
            {t("user.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
