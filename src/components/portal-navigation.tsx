"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquareText } from "lucide-react";
import type { PortalAccountRole } from "@/lib/portal-account";

export function PortalNavigation({ role, home }: { role: PortalAccountRole; home: string }) {
  const pathname = usePathname();
  const links = [
    { href: home, label: "Overview", icon: Home },
    ...(role === "PARENT"
      ? [{ href: "/parent/feedback", label: "Teacher feedback", icon: MessageSquareText }]
      : []),
  ];

  return (
    <nav aria-label="Portal navigation" className="mt-3 space-y-1">
      {links.map((item) => {
        const active = pathname === item.href || (item.href !== home && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        return (
          <Link
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-black ${
              active
                ? "bg-[#fff0f1] text-[#b91118]"
                : "text-[#5f6874] hover:bg-[#f5f6f7] hover:text-[#b91118]"
            }`}
            href={item.href}
            key={item.href}
          >
            <Icon size={18} /> {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
