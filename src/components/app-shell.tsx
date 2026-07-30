"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpenText,
  Building2,
  ClipboardClock,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient();
const navigation: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
}> = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: GraduationCap, permission: "students.read" },
  { href: "/structure", label: "School structure", icon: Building2, permission: "campus.read" },
  { href: "/academics", label: "Academics", icon: BookOpenText, permission: "academic.read" },
  { href: "/people", label: "People & roles", icon: Users, permission: "people.read" },
  { href: "/audit", label: "Audit history", icon: ClipboardClock, permission: "audit.read" },
  { href: "/settings", label: "System settings", icon: Settings, permission: "system.manage" },
];

export function AppShell({
  children,
  viewer,
  permissions,
}: {
  children: React.ReactNode;
  viewer: {
    name: string;
    email: string;
    role: string;
    school: string;
    campus: string | null;
  };
  permissions: Permission[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const allowed = new Set(permissions);
  const links = navigation.filter((item) => !item.permission || allowed.has(item.permission));

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
          <Link className="flex items-center gap-3" href="/dashboard">
            <span className="grid size-10 place-items-center rounded-xl bg-[#d71920] text-white">
              <GraduationCap size={22} />
            </span>
            <span>
              <strong className="block text-[.98rem]">Petra LMS</strong>
              <small className="text-[.67rem] font-bold uppercase tracking-[.12em] text-[#8a929f]">
                School operations
              </small>
            </span>
          </Link>
          <button
            aria-label="Close navigation"
            className="grid size-10 place-items-center lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X size={22} />
          </button>
        </div>
        <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-2 px-3 text-[.68rem] font-extrabold uppercase tracking-[.13em] text-[#9aa1ab]">
            Workspace
          </p>
          <div className="space-y-1">
            {links.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold ${
                    active
                      ? "bg-[#fff0f1] text-[#b91118]"
                      : "text-[#58616e] hover:bg-[#f5f6f7]"
                  }`}
                  href={item.href}
                  key={item.href}
                  onClick={() => setOpen(false)}
                >
                  <Icon size={19} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="border-t border-[#eceef1] p-3">
          <div className="rounded-xl bg-[#f6f7f8] p-3">
            <p className="flex items-center gap-2 text-xs font-extrabold text-[#4e5662]">
              <ShieldCheck size={16} className="text-[#d71920]" />
              {viewer.role}
            </p>
            <p className="mt-2 truncate text-sm font-extrabold">{viewer.school}</p>
            <p className="truncate text-xs text-[#777f8b]">{viewer.campus ?? "All campuses"}</p>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-[4.6rem] items-center justify-between border-b border-[#e4e6ea] bg-white/95 px-4 backdrop-blur md:px-7">
          <button
            aria-label="Open navigation"
            className="grid size-10 place-items-center rounded-xl border border-[#e4e6ea] lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu size={21} />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-extrabold">{viewer.name}</p>
              <p className="text-[.68rem] text-[#7b838e]">{viewer.email}</p>
            </div>
            <button
              aria-label="Sign out"
              className="grid size-10 place-items-center rounded-xl border border-[#e4e6ea] text-[#606875]"
              onClick={async () => {
                await authClient.signOut();
                router.replace("/login");
                router.refresh();
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[96rem] p-4 md:p-7 lg:p-9">{children}</main>
      </div>
    </div>
  );
}

