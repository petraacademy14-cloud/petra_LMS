import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { loginApplicant } from "@/app/actions/admissions";

export const metadata: Metadata = { title: "Applicant login" };

type ApplicantLoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ApplicantLoginPage({ searchParams }: ApplicantLoginPageProps) {
  const { error } = await searchParams;
  const message =
    error === "account-exists"
      ? "An applicant account already exists for that email address. Sign in to continue."
      : error === "invalid"
        ? "The email address or password is incorrect."
        : null;

  return (
    <section className="marketing-section application-form-section">
      <div className="marketing-shell applicant-login-shell">
        <Link className="back-link" href="/apply"><ArrowLeft size={17} /> Back to applications</Link>
        <div className="marketing-card applicant-login-card">
          <span className="section-kicker">Returning applicant</span>
          <h1>Continue your application</h1>
          <p>Sign in with the guardian email address and password used to create the application.</p>
          {message && <div className="form-alert" role="alert"><CircleAlert size={18} />{message}</div>}
          <form action={loginApplicant} className="marketing-form applicant-login-form">
            <label><span>Email address *</span><input autoComplete="email" name="email" required type="email" /></label>
            <label><span>Password *</span><input autoComplete="current-password" minLength={10} name="password" required type="password" /></label>
            <button className="button button-lg" type="submit">Sign in</button>
            <p className="form-note">Applicant access is separate from the Student, Parent and Teacher login.</p>
          </form>
          <p className="form-note">New applicant? <Link className="text-link" href="/apply/start">Create an account</Link>.</p>
        </div>
      </div>
    </section>
  );
}
