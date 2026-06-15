"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import UserMenu from "@/components/user-menu";

export default function Nav() {
  const pathname = usePathname();
  const { lang, setLang, t } = useI18n();

  const links = [
    { href: "/trips/new", label: t("nav.discover") },
    { href: "/bucket-list", label: t("nav.bucketList") },
    { href: "/travel", label: "MATCHING" },
  ];

  return (
    <nav className="border-b border-[#D4D0C8]">
      <div className="max-w-5xl mx-auto px-6 py-4 md:py-5 flex items-center justify-between gap-3 md:gap-4">
        <Link href="/" className="font-serif text-xl tracking-tight shrink-0 flex items-center">
          Myra
          <span className="inline-block w-[5px] h-[5px] rounded-full bg-[#EBCFBE] ml-[3px] mb-[2px] self-center" />
        </Link>
        <div className="flex items-center gap-3 md:gap-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[10px] md:text-xs tracking-[0.12em] md:tracking-[0.2em] whitespace-nowrap transition-colors py-2.5 md:py-1 active:text-[#1A1A1A] ${
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href))
                  ? "text-[#1A1A1A]"
                  : "text-[#1A1A1A]/55 hover:text-[#1A1A1A]/70"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            className="text-[10px] md:text-xs tracking-wide text-[#1A1A1A]/55 hover:text-[#1A1A1A] active:text-[#1A1A1A] transition-colors border-l border-[#D4D0C8] pl-3 md:pl-6 py-2.5 md:py-1 whitespace-nowrap"
            aria-label={t("nav.switchLang")}
          >
            {lang === "en" ? "中文" : "EN"}
          </button>
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
