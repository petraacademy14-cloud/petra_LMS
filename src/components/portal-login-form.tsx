"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { portalLogin, type PortalAuthState } from "@/app/actions/portal-auth";
import type { PortalAccountRole } from "@/lib/portal-account";

const initialState: PortalAuthState = { status: "idle", message: "" };

export function PortalLoginForm({ role }: { role: PortalAccountRole }) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState(
    portalLogin.bind(null, role),
    initialState,
  );

  return (
    <form action={action} className="mt-8 space-y-5">
      <div>
        <label className="mb-2 block text-sm font-extrabold" htmlFor={`${role}-username`}>
          Username
        </label>
        <div className="relative">
          <UserRound
            aria-hidden
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c939e]"
            size={18}
          />
          <input
            autoCapitalize="none"
            autoComplete="username"
            className="h-12 w-full rounded-xl border border-[#dfe2e6] bg-white pl-11 pr-3 outline-none transition focus:border-[#d71920]"
            id={`${role}-username`}
            name="username"
            placeholder={role === "STUDENT" ? "Your admission number" : "Username issued by Petra"}
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-extrabold" htmlFor={`${role}-password`}>
          Password
        </label>
        <div className="relative">
          <LockKeyhole
            aria-hidden
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c939e]"
            size={18}
          />
          <input
            autoComplete="current-password"
            className="h-12 w-full rounded-xl border border-[#dfe2e6] bg-white pl-11 pr-12 outline-none transition focus:border-[#d71920]"
            id={`${role}-password`}
            name="password"
            required
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-[#747c87] hover:bg-[#f3f4f5]"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {state.status === "error" && (
        <p
          aria-live="polite"
          className="rounded-xl border border-[#f2b8bc] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#a20e14]"
        >
          {state.message}
        </p>
      )}

      <button className="button w-full" disabled={pending} type="submit">
        {pending && <LoaderCircle className="animate-spin" size={18} />}
        {pending ? "Signing in…" : "Sign in securely"}
      </button>
    </form>
  );
}
