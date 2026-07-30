import Link from "next/link";

const links = [
  ["/fees", "Dashboard"],
  ["/fees/record", "Record"],
  ["/fees/structures", "Structures"],
  ["/fees/reports", "Reports"],
  ["/fees/reconciliation", "Reconcile"],
  ["/fees/reminders", "Reminders"],
] as const;

export function FinanceNav() {
  return (
    <nav
      aria-label="Fees navigation"
      className="mt-6 flex gap-2 overflow-x-auto pb-1"
    >
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
