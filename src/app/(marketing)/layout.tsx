import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { ScrollMotion } from "@/components/marketing/scroll-motion";

export const metadata: Metadata = {
  title: {
    default: "Petra Academy | Firm Foundation",
    template: "%s | Petra Academy",
  },
  description:
    "Petra Academy is a modern nursery, primary and secondary school in Awka, Anambra State, committed to strong academics, character and confident learners.",
};

export default function MarketingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="marketing-site">
      <SiteHeader />
      <section className="border-b border-red-100 bg-[#fff7f7]" aria-label="Important school notices">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="font-black uppercase tracking-[0.14em] text-[#b91118]">Important notices</span>
            <span><strong>Resumption:</strong> Monday, 14 September 2026 — Awka &amp; Nnewi campuses.</span>
            <span><strong>School fees:</strong> Parents and guardians are kindly reminded to settle required fees promptly.</span>
          </div>
          <Link className="shrink-0 font-black text-[#b91118] hover:underline" href="/news">
            Read notices →
          </Link>
        </div>
      </section>
      <ScrollMotion />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
