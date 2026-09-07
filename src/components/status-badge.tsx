"use client";

import { Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const statusConfig = {
  wishlist: { color: "bg-[#EBCFBE]", labelKey: "status.wishlist" as const },
  visited: { color: "bg-[#1A1A1A]", labelKey: "status.visited" as const },
};

export default function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.wishlist;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${config.color}`} />
      {status === "visited" && <Check size={10} strokeWidth={3} />}
      <span className="text-[10px] tracking-[0.15em] text-[#1A1A1A]/60">
        {t(config.labelKey)}
      </span>
    </span>
  );
}
