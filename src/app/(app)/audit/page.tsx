import type { Metadata } from "next";
import { Activity, Fingerprint, ShieldCheck } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Audit history",
};

export default async function AuditPage() {
  const viewer = await requirePermission("audit.read");
  const events = await db.auditLog.findMany({
    where: {
      schoolId: viewer.membership.schoolId,
      ...(viewer.membership.role === "OWNER"
        ? {}
        : { campusId: viewer.membership.campusId }),
    },
    orderBy: { occurredAt: "desc" },
    take: 100,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      occurredAt: true,
      requestId: true,
      actor: { select: { name: true, email: true } },
      campus: { select: { name: true } },
    },
  });

  return (
    <div>
      <PageHeading
        description="Important changes are recorded with the actor, campus, time, target and request context. Audit records are append-only and are never edited through the application."
        eyebrow="Accountability"
        title="Audit history"
        action={
          <span className="pill" data-tone="success">
            <ShieldCheck size={14} />
            Append-only
          </span>
        }
      />

      <section className="card mt-7 overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Target</th>
                <th>Actor</th>
                <th>Campus</th>
                <th>Request</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="text-sm text-[#68707d]">
                    {event.occurredAt.toLocaleString("en-NG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td>
                    <span className="flex items-center gap-2 font-extrabold">
                      <Activity size={15} className="text-[#d71920]" />
                      {event.action}
                    </span>
                  </td>
                  <td>
                    <span className="font-bold">{event.entityType}</span>
                    {event.entityId && (
                      <span className="ml-2 text-xs text-[#9299a3]">
                        {event.entityId.slice(0, 8)}
                      </span>
                    )}
                  </td>
                  <td className="text-sm">
                    {event.actor?.name ?? "System"}
                    {event.actor && (
                      <span className="block text-xs text-[#89919c]">
                        {event.actor.email}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="pill">
                      {event.campus?.name ?? "School-wide"}
                    </span>
                  </td>
                  <td>
                    {event.requestId ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-[#717985]">
                        <Fingerprint size={14} />
                        {event.requestId.slice(0, 10)}
                      </span>
                    ) : (
                      <span className="text-[#a0a6ae]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!events.length && (
          <div className="empty-state">
            No audited changes have been recorded in this scope yet.
          </div>
        )}
      </section>
    </div>
  );
}
