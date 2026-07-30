"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  Building2,
  ChevronDown,
  ClipboardClock,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import type { Permission } from "@/lib/permissions";

const navigation: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
}> = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  {
    href: "/students",
    label: "Students",
    icon: GraduationCap,
    permission: "students.read",
  },
  {
    href: "/structure",
    label: "School structure",
    icon: Building2,
    permission: "campus.read",
  },
  {
    href: "/academics",
    label: "Academics",
    icon: BookOpenText,
    permission: "academic.read",
  },
  {
    href: "/people",
    label: "People & roles",
    icon: Users,
    permission: "people.read",
  },
  {
    href: "/audit",
    label: "Audit history",
    icon: ClipboardClock,
    permission: "audit.read",
  },
  {
    href: "/settings",
    label: "System settings",
    icon: Settings,
    permission: "system.manage",
  },
];

type AppShellProps = {
  children: React.ReactNode;
  viewer: {
    name: string;
    email: string;
    role: string;
    school: string;
    campus: string | null;
  };
  permissions: Permission[];
};

export function AppShell({ children, viewer, permissions }: AppShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const permissionSet = new Set(permissions);
  const links = navigation.filter(
    (item) => !item.permission || permissionSet.has(item.permission),
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/45 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[17rem] flex-col border-r border-[#e4e6ea] bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[4.6rem] items-center justify-between border-b border-[#eceef1] px-5">
          <Brand />
          <button
            aria-label="Close navigation"
            className="grid size-10 place-items-center rounded-lg text-[#626b78] lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X size={22} />
          </button>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 px-3 py-5">
          <p className="mb-2 px-3 text-[0.68rem] font-extrabold uppercase tracking-[0.13em] text-[#9aa1ab]">
            Workspace
          </p>
          <div className="space-y-1">
            {links.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors ${
                    active
                      ? "bg-[#fff0f1] text-[#b91118]"
                      : "text-[#58616e] hover:bg-[#f5f6f7] hover:text-[#252a31]"
                  }`}
                  href={item.href}
                  key={item.href}
                  onClick={() => setOpen(false)}
                >
                  <Icon size={19} strokeWidth={active ? 2.5 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-[#eceef1] p-3">
          <div className="rounded-xl bg-[#f6f7f8] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-[#4e5662]">
              <ShieldCheck size={16} className="text-[#d71920]" />
              {viewer.role}
            </div>
            <p className="truncate text-sm font-extrabold">{viewer.school}</p>
            <p className="mt-0.5 truncate text-xs text-[#777f8b]">
              {viewer.campus ?? "All campuses"}
            </p>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-[4.6rem] items-center justify-between border-b border-[#e4e6ea] bg-white/95 px-4 backdrop-blur md:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open navigation"
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#e4e6ea] text-[#4e5662] lg:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">{viewer.school}</p>
              <p className="truncate text-xs text-[#7b838e]">
                {viewer.campus ?? "Awka & Nnewi overview"}
              </p>
            </div>
          </div>

          <div className="group relative">
            <button className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-left hover:bg-[#f5f6f7]">
              <span className="grid size-9 place-items-center rounded-full bg-[#2d323a] text-sm font-extrabold text-white">
                {viewer.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden max-w-40 sm:block">
                <strong className="block truncate text-xs">{viewer.name}</strong>
                <small className="block truncate text-[0.68rem] text-[#7b838e]">
                  {viewer.email}
                </small>
              </span>
              <ChevronDown size={15} className="text-[#8b929c]" />
            </button>
            <div className="invisible absolute right-0 top-full w-44 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className="card p-1.5 shadow-lg">
                <SignOutButton />
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[96rem] p-4 md:p-7 lg:p-9">
          {children}
        </main>
      </div>
    </div>
  );
}
