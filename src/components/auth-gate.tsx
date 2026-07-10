"use client";

import { useSession, signIn } from "next-auth/react";
import { useI18n } from "@/lib/i18n";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { t } = useI18n();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-5 h-5 border-2 border-[#D4D0C8] border-t-[#1A1A1A] rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-6">
        <p className="font-serif text-2xl md:text-3xl mb-3">{t("auth.heading")}</p>
        <p className="text-sm text-[#1A1A1A]/70 mb-2 max-w-sm leading-relaxed">
          {t("auth.desc")}
        </p>
        <p className="text-xs text-[#1A1A1A]/70 mb-8 max-w-xs">
          {t("auth.privacy")}
        </p>
        <button
          onClick={() => signIn("google")}
          className="inline-flex items-center justify-center min-h-[44px] text-xs tracking-[0.15em] border border-[#1A1A1A] px-6 py-3 hover:bg-[#1A1A1A] hover:text-[#F7F5F0] transition-colors"
        >
          {t("auth.signInGoogle")}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
