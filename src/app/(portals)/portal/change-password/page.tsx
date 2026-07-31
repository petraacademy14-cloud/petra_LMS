import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { PortalPasswordForm } from "@/components/portal-password-form";
import { portalHome, portalRoleLabel } from "@/lib/portal-account";
import { requirePortalViewer } from "@/lib/portal-auth";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function PortalChangePasswordPage() {
  const viewer = await requirePortalViewer({ allowPasswordChange: true });
  if (!viewer.mustChangePassword) redirect(portalHome(viewer.role));

  return (
    <main className="role-login-page">
      <div className="role-login-shell">
        <div className="role-login-card">
          <div className="role-login-brand">
            <Image src="/petra-academy-logo.svg" alt="Petra Academy" width={86} height={86} priority />
            <span className="portal-choice-icon"><KeyRound size={25} /></span>
          </div>
          <span className="section-kicker">First secure sign-in</span>
          <h1>Choose your own password</h1>
          <p>{viewer.displayName}, replace the temporary password issued for your {portalRoleLabel(viewer.role).toLowerCase()} account.</p>
          <div className="mt-5 flex gap-3 rounded-xl bg-[#f5f6f8] p-4 text-sm text-[#5f6874]"><ShieldCheck className="shrink-0 text-[#d71920]" size={20} /><p>Use at least 10 characters. Do not share the new password with students, friends or other families.</p></div>
          <PortalPasswordForm />
        </div>
      </div>
    </main>
  );
}
