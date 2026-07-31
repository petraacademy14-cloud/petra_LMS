import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";

export const metadata: Metadata = { title: "Start application" };

export default function StartApplicationPage() {
  return (
    <section className="marketing-section application-form-section">
      <div className="marketing-shell narrow-form-shell">
        <Link className="back-link" href="/apply"><ArrowLeft size={17} /> Back to applications</Link>
        <div className="form-intro">
          <span className="section-kicker">New applicant</span>
          <h1>Create the application account</h1>
          <p>The guardian who manages the application should provide their details below. This account will be used for payments, examination details and the admission decision.</p>
        </div>
        <form className="marketing-form marketing-card applicant-account-form">
          <div className="field-grid">
            <label><span>Guardian first name *</span><input autoComplete="given-name" name="firstName" required /></label>
            <label><span>Guardian last name *</span><input autoComplete="family-name" name="lastName" required /></label>
            <label className="field-full"><span>Email address *</span><input autoComplete="email" name="email" required type="email" /></label>
            <label><span>Phone number *</span><input autoComplete="tel" inputMode="tel" name="phone" required /></label>
            <label><span>Relationship to student *</span><select name="relationship" required defaultValue=""><option value="" disabled>Select relationship</option><option>Father</option><option>Mother</option><option>Guardian</option><option>Other relative</option></select></label>
            <label><span>Password *</span><input autoComplete="new-password" minLength={10} name="password" required type="password" /></label>
            <label><span>Confirm password *</span><input autoComplete="new-password" minLength={10} name="confirmPassword" required type="password" /></label>
          </div>
          <div className="security-note"><LockKeyhole size={19} /><span>Use at least 10 characters. The admissions backend will verify the email address before an application can be submitted.</span></div>
          <button className="button button-lg" type="submit">Create account and continue</button>
          <p className="form-note">Account creation will become active with the applicant data model and verification workflow in Sprint 6A.2.</p>
        </form>
      </div>
    </section>
  );
}
