import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { ApplicantPasswordForm } from "@/components/applicant-password-form";
import { requireApplicant } from "@/lib/applicant-auth";

export const metadata: Metadata = { title: "Choose a new applicant password" };

export default async function ApplicantChangePasswordPage() {
  const viewer = await requireApplicant({ allowPasswordChange: true });
  if (!viewer.mustChangePassword) redirect("/apply/status");

  return (
    <section className="marketing-section application-form-section">
      <div className="marketing-shell applicant-login-shell">
        <div className="marketing-card applicant-login-card">
          <span className="section-kicker"><KeyRound size={17} /> Secure account recovery</span>
          <h1>Choose your new password</h1>
          <p>{viewer.firstName}, replace the temporary password issued by Petra Academy before continuing application {viewer.applicationNumber}.</p>
          <div className="security-note"><ShieldCheck size={19} /><span>Use at least 10 characters. Do not share your new password with anyone.</span></div>
          <ApplicantPasswordForm />
        </div>
      </div>
    </section>
  );
}
