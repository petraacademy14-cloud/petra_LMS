"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  changeApplicantPassword,
  type ApplicantAccountActionState,
} from "@/app/actions/applicant-accounts";

const initialState: ApplicantAccountActionState = {
  status: "idle",
  message: "",
};

export function ApplicantPasswordForm() {
  const [state, action, pending] = useActionState(
    changeApplicantPassword,
    initialState,
  );

  return (
    <form action={action} className="marketing-form applicant-login-form">
      <label><span>New password *</span><input autoComplete="new-password" minLength={10} name="password" required type="password" /></label>
      <label><span>Confirm new password *</span><input autoComplete="new-password" minLength={10} name="confirmPassword" required type="password" /></label>
      {state.status === "error" && <div className="form-alert" aria-live="polite">{state.message}</div>}
      <button className="button button-lg" disabled={pending} type="submit">
        {pending && <LoaderCircle className="animate-spin" size={18} />}
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
