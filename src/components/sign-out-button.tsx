"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-[#5f6671] hover:bg-[#f5f6f7]"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/login");
        router.refresh();
      }}
      type="button"
    >
      <LogOut size={16} />
      Sign out
    </button>
  );
}
