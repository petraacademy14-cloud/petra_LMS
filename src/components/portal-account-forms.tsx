"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound, LoaderCircle } from "lucide-react";
import {
  provisionPortalAccount,
  resetPortalPassword,
  type PortalAccountActionState,
} from "@/app/actions/portal-accounts";
import {
  portalRoleLabel,
  type PortalAccountRole,
} from "@/lib/portal-account";

type Option = { value: string; label: string };

const initialState: PortalAccountActionState = {
  status: "idle",
  message: "",
};

function CredentialPanel({
  credentials,
}: {
  credentials: NonNullable<PortalAccountActionState["credentials"]>;
}) {
  const [copied, setCopied] = useState(false);
  const text = `Petra Academy ${portalRoleLabel(credentials.role)} portal\nName: ${credentials.displayName}\nUsername: ${credentials.username}\nTemporary password: ${credentials.temporaryPassword}\nLogin: https://petra-lms.vercel.app/login/${credentials.role.toLowerCase()}\nYou will be required to choose a new password after signing in.`;

  async function copyCredentials() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-[#b8dfc5] bg-[#effaf2] p-4 text-sm text-[#155d31]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <strong className="block text-base">Copy these credentials now</strong>
          <p className="mt-1">The temporary password cannot be viewed again after this message disappears.</p>
        </div>
        <button className="button button-secondary" onClick={copyCredentials} type="button">
          {copied ? <Check size={17} /> : <Copy size={17} />}
          {copied ? "Copied" : "Copy message"}
        </button>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div><dt className="text-xs font-black uppercase tracking-wide">Username</dt><dd className="mt-1 break-all font-mono text-base font-black">{credentials.username}</dd></div>
        <div><dt className="text-xs font-black uppercase tracking-wide">Temporary password</dt><dd className="mt-1 break-all font-mono text-base font-black">{credentials.temporaryPassword}</dd></div>
      </dl>
    </div>
  );
}

function Feedback({ state }: { state: PortalAccountActionState }) {
  if (state.status === "idle") return null;
  return (
    <div className="space-y-3" aria-live="polite">
      <p
        className={`rounded-xl border px-4 py-3 text-sm font-bold ${
          state.status === "success"
            ? "border-[#b8dfc5] bg-[#effaf2] text-[#176b35]"
            : "border-[#f2b8bc] bg-[#fff1f2] text-[#a20e14]"
        }`}
      >
        {state.message}
      </p>
      {state.credentials && <CredentialPanel credentials={state.credentials} />}
    </div>
  );
}

export function ProvisionPortalAccountForm({
  role,
  options,
}: {
  role: PortalAccountRole;
  options: Option[];
}) {
  const [state, action, pending] = useActionState(
    provisionPortalAccount,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <input name="role" type="hidden" value={role} />
      <Feedback state={state} />
      <label className="block text-sm font-extrabold">
        {role === "PARENT" ? "Guardian" : "Student"}
        <select
          className="mt-2 h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3 font-medium outline-none focus:border-[#d71920]"
          name="targetId"
          required
        >
          <option value="">Select…</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-extrabold">
        Username override <span className="font-medium text-[#7b838e]">(optional)</span>
        <input
          autoCapitalize="none"
          className="mt-2 h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3 font-medium outline-none focus:border-[#d71920]"
          name="username"
          placeholder={role === "STUDENT" ? "Admission number is used automatically" : "Phone-based username is generated automatically"}
        />
      </label>
      <button className="button w-full" disabled={pending || options.length === 0} type="submit">
        {pending ? <LoaderCircle className="animate-spin" size={18} /> : <KeyRound size={18} />}
        {pending ? "Creating…" : `Create ${portalRoleLabel(role).toLowerCase()} account`}
      </button>
      {!options.length && (
        <p className="text-sm font-medium text-[#747c87]">Every eligible record in this scope already has an account.</p>
      )}
    </form>
  );
}

export function PortalPasswordResetForm({ accountId }: { accountId: string }) {
  const [state, action, pending] = useActionState(
    resetPortalPassword.bind(null, accountId),
    initialState,
  );

  return (
    <div className="space-y-3">
      <Feedback state={state} />
      <form action={action}>
        <button className="button button-secondary" disabled={pending} type="submit">
          {pending ? <LoaderCircle className="animate-spin" size={16} /> : <KeyRound size={16} />}
          {pending ? "Resetting…" : "Reset password"}
        </button>
      </form>
    </div>
  );
}
