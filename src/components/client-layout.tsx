"use client";

import { I18nProvider } from "@/lib/i18n";
import SessionProvider from "@/components/session-provider";
import Nav from "@/components/nav";
import Footer from "@/components/footer";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#1A1A1A] focus:text-white focus:text-sm focus:tracking-wide"
        >
          Skip to main content
        </a>
        <Nav />
        <main id="main-content" className="max-w-5xl mx-auto px-6 py-10">{children}</main>
        <Footer />
      </I18nProvider>
    </SessionProvider>
  );
}
