import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Applicant login" };

export default function ApplicantLoginPage() {
  return (
    <section className="marketing-section application-form-section">
      <div className="marketing-shell applicant-login-shell">
        <Link className="back-link" href="/apply"><ArrowLeft size={17} /> Back to applications</Link>
        <div className="marketing-card applicant-login-card">
          <span className="section-kicker">Returning applicant</span>
          <h1>Continue your application</h1>
          <p>Sign in with the guardian email address and password used to create the application.</p>
          <form className="marketing-form applicant-login-form">
            <label><span>Email address *</span><input autoComplete="email" name="email" required type="email" /></label>
            <label><span>Password *</span><input autoComplete="current-password" minLength={10} name="password" required type="password" /></label>
            <button className="button button-lg" type="submit">Sign in</button>
            <p className="form-note">Applicant authentication will be connected in Sprint 6A.2. Staff, student, parent and teacher access remains under the main Login page.</p>
          </form>
        </div>
      </div>
    </section>
  );
}
