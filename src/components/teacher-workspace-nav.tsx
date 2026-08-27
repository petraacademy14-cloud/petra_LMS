"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  FileText,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
} from "lucide-react";

const links = [
  { href: "/teacher", label: "Overview", icon: LayoutDashboard },
  { href: "/teacher/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/teacher/results", label: "Results", icon: FileText },
  { href: "/teacher/communications", label: "Class notices", icon: Megaphone },
  { href: "/teacher/feedback", label: "Parent feedback", icon: MessageSquareText },
];

export function TeacherWorkspaceNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Teacher workspace"
      className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-[#e5e7eb] bg-white p-2"
    >
      {links.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/teacher" && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        return (
          <Link
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-black ${
              active
                ? "bg-[#fff0f1] text-[#b91118]"
                : "text-[#626b78] hover:bg-[#f5f6f7]"
            }`}
            href={item.href}
            key={item.href}
          >
            <Icon size={17} /> {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
