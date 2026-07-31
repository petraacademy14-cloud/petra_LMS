import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GraduationCap, School, Users } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { PortalLoginForm } from "@/components/portal-login-form";
import type { PortalAccountRole } from "@/lib/portal-account";

const portals = {
  student: {
    title: "Student login",
    detail: "Use the student username and temporary password issued by Petra Academy.",
    icon: GraduationCap,
    portalRole: "STUDENT" as PortalAccountRole,
  },
  parent: {
    title: "Parent login",
    detail: "Use the parent or guardian username and temporary password issued by Petra Academy.",
    icon: Users,
    portalRole: "PARENT" as PortalAccountRole,
  },
  teacher: {
    title: "Teacher login",
    detail: "Use your staff email address and password.",
    icon: School,
    portalRole: null,
  },
} as const;

type PortalRole = keyof typeof portals;

export async function generateMetadata({ params }: { params: Promise<{ role: string }> }): Promise<Metadata> {
  const { role } = await params;
  const portal = portals[role as PortalRole];
  return { title: portal?.title ?? "Login" };
}

export default async function RoleLoginPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const portal = portals[role as PortalRole];
  if (!portal) notFound();
  const Icon = portal.icon;

  return (
    <main className="role-login-page">
      <div className="role-login-shell">
        <Link className="back-link" href="/login"><ArrowLeft size={17} /> Choose another portal</Link>
        <div className="role-login-card">
          <div className="role-login-brand">
            <Image src="/petra-academy-logo.svg" alt="Petra Academy" width={86} height={86} priority />
            <span className="portal-choice-icon"><Icon size={25} /></span>
          </div>
          <span className="section-kicker">Petra Academy</span>
          <h1>{portal.title}</h1>
          <p>{portal.detail}</p>
          {portal.portalRole ? <PortalLoginForm role={portal.portalRole} /> : <LoginForm />}
        </div>
        <p className="portal-help">Your portal access is protected. Never share your password.</p>
      </div>
    </main>
  );
}
