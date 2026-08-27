"use client";

import { useActionState, useState } from "react";
import { Check, Copy, LoaderCircle, UserPlus } from "lucide-react";
import {
  createStaffAccount,
  type StaffAccountActionState,
} from "@/app/actions/staff-accounts";

type Option = { value: string; label: string };

const initialState: StaffAccountActionState = {
  status: "idle",
  message: "",
};

export function StaffAccountCreateForm({ campuses }: { campuses: Option[] }) {
  const [state, action, pending] = useActionState(createStaffAccount, initialState);
  const [copied, setCopied] = useState(false);

  async function copyCredentials() {
    if (!state.credentials) return;
    const loginUrl = `${window.location.origin}/login/teacher`;
    const message = [
      "Petra Academy staff account",
      `Name: ${state.credentials.name}`,
      `Role: ${state.credentials.role}`,
      `Campus: ${state.credentials.campusName}`,
      `Email: ${state.credentials.email}`,
      `Temporary password: ${state.credentials.temporaryPassword}`,
      `Login: ${loginUrl}`,
    ].join("\n");
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      {state.status !== "idle" && (
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
          {state.credentials && (
            <div className="rounded-2xl border border-[#b8dfc5] bg-[#effaf2] p-4 text-sm text-[#155d31]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <strong className="block text-base">Copy these credentials now</strong>
                  <p className="mt-1">The temporary password is shown only once.</p>
                </div>
                <button
                  className="button button-secondary"
                  onClick={copyCredentials}
                  type="button"
                >
                  {copied ? <Check size={17} /> : <Copy size={17} />}
                  {copied ? "Copied" : "Copy credentials"}
                </button>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-black uppercase tracking-wide">Email</dt>
                  <dd className="mt-1 break-all font-mono font-black">
                    {state.credentials.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-black uppercase tracking-wide">Temporary password</dt>
                  <dd className="mt-1 break-all font-mono font-black">
                    {state.credentials.temporaryPassword}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      )}

      <form action={action} className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-extrabold">
          Full name
          <input
            className="mt-2 h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3 font-medium outline-none focus:border-[#d71920]"
            name="name"
            placeholder="e.g. Chidinma Okafor"
            required
          />
        </label>
        <label className="block text-sm font-extrabold">
          Email address
          <input
            autoCapitalize="none"
            className="mt-2 h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3 font-medium outline-none focus:border-[#d71920]"
            name="email"
            placeholder="teacher@petraacademy.com"
            required
            type="email"
          />
        </label>
        <label className="block text-sm font-extrabold">
          Staff role
          <select
            className="mt-2 h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3 font-medium outline-none focus:border-[#d71920]"
            defaultValue="TEACHER"
            name="role"
            required
          >
            <option value="TEACHER">Teacher</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </label>
        <label className="block text-sm font-extrabold">
          Campus
          <select
            className="mt-2 h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3 font-medium outline-none focus:border-[#d71920]"
            name="campusId"
            required
          >
            <option value="">Select campus…</option>
            {campuses.map((campus) => (
              <option key={campus.value} value={campus.value}>
                {campus.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button md:col-span-2"
          disabled={pending || campuses.length === 0}
          type="submit"
        >
          {pending ? <LoaderCircle className="animate-spin" size={18} /> : <UserPlus size={18} />}
          {pending ? "Creating account…" : "Create staff account"}
        </button>
      </form>
    </div>
  );
}
