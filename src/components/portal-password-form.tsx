"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  changePortalPassword,
  type PortalAuthState,
} from "@/app/actions/portal-auth";

const initialState: PortalAuthState = { status: "idle", message: "" };

export function PortalPasswordForm() {
  const [state, action, pending] = useActionState(
    changePortalPassword,
    initialState,
  );

  return (
    <form action={action} className="mt-7 space-y-5">
      <label className="block text-sm font-extrabold">
        New password
        <input
          autoComplete="new-password"
          className="mt-2 h-12 w-full rounded-xl border border-[#dfe2e6] bg-white px-3 outline-none focus:border-[#d71920]"
          minLength={10}
          name="password"
          required
          type="password"
        />
      </label>
      <label className="block text-sm font-extrabold">
        Confirm new password
        <input
          autoComplete="new-password"
          className="mt-2 h-12 w-full rounded-xl border border-[#dfe2e6] bg-white px-3 outline-none focus:border-[#d71920]"
          minLength={10}
          name="confirmPassword"
          required
          type="password"
        />
      </label>
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
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
