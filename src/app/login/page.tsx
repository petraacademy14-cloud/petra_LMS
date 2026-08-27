import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, GraduationCap, School, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Login",
  description: "Choose the Petra Academy student, parent or teacher portal.",
};

const portals = [
  { role: "student", title: "Student", detail: "Access results, assignments, timetables and school updates.", icon: GraduationCap },
  { role: "parent", title: "Parent", detail: "View your children, fees, receipts, attendance and academic reports.", icon: Users },
  { role: "teacher", title: "Teacher", detail: "Manage classes, attendance, assignments, results and communication.", icon: School },
] as const;

export default function LoginPage() {
  return (
    <main className="portal-entry">
      <div className="portal-entry-shell">
        <Link className="back-link" href="/"><ArrowLeft size={17} /> Back to website</Link>
        <div className="portal-entry-brand">
          <Image src="/brand/petra-logo.webp" alt="Petra Academy" width={124} height={124} priority unoptimized />
          <span className="section-kicker">Petra Academy portals</span>
          <h1>Welcome back</h1>
          <p>Choose the portal that matches the credentials issued to you.</p>
        </div>
        <div className="portal-choice-grid">
          {portals.map(({ role, title, detail, icon: Icon }) => (
            <Link className="portal-choice" href={`/login/${role}`} key={role}>
              <span className="portal-choice-icon"><Icon size={28} /></span>
              <h2>{title}</h2>
              <p>{detail}</p>
              <strong>Continue to {title.toLowerCase()} login →</strong>
            </Link>
          ))}
        </div>
        <p className="portal-help">Contact Petra Academy if you have not received your portal credentials.</p>
      </div>
    </main>
  );
}
