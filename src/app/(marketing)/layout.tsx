import type { Metadata } from "next";
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
      <ScrollMotion />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
