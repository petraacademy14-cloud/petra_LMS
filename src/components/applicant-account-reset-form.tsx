"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound, LoaderCircle } from "lucide-react";
import {
  resetApplicantPassword,
  type ApplicantAccountActionState,
} from "@/app/actions/applicant-accounts";

const initialState: ApplicantAccountActionState = {
  status: "idle",
  message: "",
};

export function ApplicantAccountResetForm({
  applicationId,
}: {
  applicationId: string;
}) {
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState(
    resetApplicantPassword.bind(null, applicationId),
    initialState,
  );

  async function copyCredentials() {
    if (!state.credentials) return;
    const text = `Petra Academy applicant portal\nGuardian: ${state.credentials.guardianName}\nEmail: ${state.credentials.email}\nTemporary password: ${state.credentials.temporaryPassword}\nLogin: ${window.location.origin}/apply/login\nYou will be required to choose a new password after signing in.`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      {state.status !== "idle" && (
        <p
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-sm font-bold ${
            state.status === "success"
              ? "border-[#b8dfc5] bg-[#effaf2] text-[#176b35]"
              : "border-[#f2b8bc] bg-[#fff1f2] text-[#a20e14]"
          }`}
        >
          {state.message}
        </p>
      )}

      {state.credentials && (
        <div className="rounded-xl border border-[#b8dfc5] bg-[#effaf2] p-3 text-sm text-[#155d31]">
          <strong className="block">Copy these credentials now</strong>
          <p className="mt-1">The temporary password cannot be viewed again.</p>
          <dl className="mt-3 space-y-2">
            <div><dt className="text-xs font-black uppercase">Email</dt><dd className="break-all font-mono font-black">{state.credentials.email}</dd></div>
            <div><dt className="text-xs font-black uppercase">Temporary password</dt><dd className="break-all font-mono font-black">{state.credentials.temporaryPassword}</dd></div>
          </dl>
          <button className="button button-secondary mt-3" onClick={copyCredentials} type="button">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy credentials"}
          </button>
        </div>
      )}

      <form action={action}>
        <button className="button button-secondary" disabled={pending} type="submit">
          {pending ? <LoaderCircle className="animate-spin" size={16} /> : <KeyRound size={16} />}
          {pending ? "Resetting…" : "Create temporary password"}
        </button>
      </form>
    </div>
  );
}
