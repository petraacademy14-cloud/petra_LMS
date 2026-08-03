import Image from "next/image";
import Link from "next/link";
import { Home, LogOut, ShieldCheck } from "lucide-react";
import { logoutPortal } from "@/app/actions/portal-auth";
import { portalHome, portalRoleLabel, type PortalAccountRole } from "@/lib/portal-account";

type PortalShellProps = {
  children: React.ReactNode;
  viewer: {
    role: PortalAccountRole;
    displayName: string;
    username: string;
  };
};

export function PortalShell({ children, viewer }: PortalShellProps) {
  const home = portalHome(viewer.role);

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <header className="border-b border-[#e2e5e9] bg-white">
        <div className="mx-auto flex min-h-[4.75rem] max-w-[92rem] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-7">
          <Link className="flex items-center gap-3" href={home}>
            <Image alt="Petra Academy" height={48} priority src="/brand/petra-logo.webp" width={48} unoptimized />
            <span>
              <strong className="block text-base leading-tight">Petra Academy</strong>
              <small className="block text-xs font-bold uppercase tracking-[0.12em] text-[#858d98]">
                {portalRoleLabel(viewer.role)} portal
              </small>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden rounded-xl bg-[#f5f6f8] px-3 py-2 text-right sm:block">
              <strong className="block max-w-48 truncate text-sm">{viewer.displayName}</strong>
              <small className="block max-w-48 truncate font-mono text-[0.68rem] text-[#747c87]">{viewer.username}</small>
            </div>
            <form action={logoutPortal}>
              <button className="button button-secondary" type="submit"><LogOut size={17} /> Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[92rem] gap-5 px-4 py-5 md:px-7 lg:grid-cols-[14rem_1fr] lg:py-7">
        <aside className="card h-fit p-3">
          <div className="rounded-xl bg-[#fff0f1] p-3 text-sm text-[#9d1016]">
            <ShieldCheck size={18} />
            <strong className="mt-2 block">Private family access</strong>
            <p className="mt-1 text-xs leading-5">Only records linked to this account are available.</p>
          </div>
          <nav aria-label="Portal navigation" className="mt-3">
            <Link className="flex min-h-11 items-center gap-3 rounded-xl bg-[#fff0f1] px-3 text-sm font-black text-[#b91118]" href={home}>
              <Home size={18} /> Overview
            </Link>
          </nav>
          <Link className="mt-3 block px-3 py-2 text-sm font-bold text-[#5f6874] hover:text-[#b91118]" href="/">School website</Link>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
