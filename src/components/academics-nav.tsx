import Link from "next/link";

const links = [
  ["/attendance", "Daily register"],
  ["/attendance/reports", "Attendance reports"],
  ["/results", "Score sheets"],
  ["/results/report-cards", "Report cards"],
  ["/results/settings", "Grading setup"],
] as const;

export function AcademicsNav() {
  return (
    <nav aria-label="Attendance and results navigation" className="mt-6 flex gap-2 overflow-x-auto pb-1">
      {links.map(([href, label]) => (
        <Link
          className="shrink-0 rounded-xl border border-[#e2e5e9] bg-white px-3.5 py-2.5 text-sm font-extrabold text-[#59616d] hover:border-[#d71920] hover:text-[#b91118]"
          href={href}
          key={href}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
