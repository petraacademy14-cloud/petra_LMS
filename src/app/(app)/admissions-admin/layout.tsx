import Link from "next/link";

export default function AdmissionsAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <nav className="card flex flex-wrap gap-2 p-2" aria-label="Admissions workspace">
        <Link className="button button-secondary" href="/admissions-admin">Applications and visits</Link>
        <Link className="button button-secondary" href="/admissions-admin/payments">Entrance fees and payments</Link>
      </nav>
      {children}
    </div>
  );
}
