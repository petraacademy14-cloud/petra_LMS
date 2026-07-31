import Link from "next/link";
import { Brand } from "@/components/brand";
export default function UpdatesLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white"><header className="border-b border-[#e5e7eb]"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><Brand/><nav className="flex gap-4 text-sm font-black"><Link href="/updates">News & events</Link><Link href="/login">Staff sign in</Link></nav></div></header>{children}</div>;
}
