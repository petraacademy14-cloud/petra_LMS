import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarRange, FileText, MapPin, Phone, UserRound } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import {
  GuardianForm,
  StudentDocumentForm,
  StudentStatusForm,
} from "@/components/student-forms";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "Student profile" };

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const viewer = await requirePermission("students.read");
  const { studentId } = await params;
  const student = await db.student.findFirst({
    where: {
      id: studentId,
      schoolId: viewer.membership.schoolId,
      ...(viewer.membership.role === "OWNER"
        ? {}
        : { campusId: viewer.membership.campusId ?? "__none__" }),
    },
    include: {
      campus: { select: { name: true } },
      guardians: {
        orderBy: [{ isPrimaryContact: "desc" }, { createdAt: "asc" }],
        include: { guardian: true },
      },
      enrollments: {
        orderBy: { startsOn: "desc" },
        include: {
          campus: { select: { name: true } },
          classArm: { include: { classLevel: { select: { name: true } } } },
          academicSession: { select: { name: true } },
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { name: true } } },
      },
    },
  });
  if (!student) notFound();
  const canManage = hasPermission(viewer.membership.role, "students.manage");

  return (
    <div>
      <PageHeading
        eyebrow={student.admissionNumber}
        title={`${student.firstName} ${student.middleName ?? ""} ${student.lastName}`.replace(/\s+/g, " ")}
        description={`${student.campus.name} · Admitted ${student.admissionDate.toLocaleDateString("en-NG")}`}
        action={<span className="pill" data-tone={student.status === "ACTIVE" ? "success" : "brand"}>{student.status}</span>}
      />
      <section className="mt-7 grid gap-5 xl:grid-cols-[.75fr_1.25fr]">
        <article className="card p-5">
          <h2 className="text-lg font-black">Profile</h2>
          <dl className="mt-4 grid gap-4 text-sm">
            <Detail label="Campus" value={student.campus.name} icon={<MapPin size={16} />} />
            <Detail label="Gender" value={student.gender ?? "Not recorded"} icon={<UserRound size={16} />} />
            <Detail label="Date of birth" value={student.dateOfBirth?.toLocaleDateString("en-NG") ?? "Not recorded"} icon={<CalendarRange size={16} />} />
            <Detail label="Address" value={student.address ?? "Not recorded"} icon={<MapPin size={16} />} />
          </dl>
        </article>
        <article className="card overflow-hidden">
          <div className="border-b border-[#e5e7eb] p-5">
            <h2 className="text-lg font-black">Guardians</h2>
            <p className="text-sm text-[#68707d]">{student.guardians.length} linked contact{student.guardians.length === 1 ? "" : "s"}</p>
          </div>
          <div className="divide-y divide-[#e5e7eb]">
            {student.guardians.map((link) => (
              <div className="p-5" key={link.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-extrabold">{link.guardian.firstName} {link.guardian.lastName}</p>
                  <span className="pill">{link.relationship}</span>
                  {link.isPrimaryContact && <span className="pill" data-tone="success">Primary</span>}
                </div>
                <p className="mt-2 flex items-center gap-2 text-sm text-[#68707d]"><Phone size={15} /> {link.guardian.phone}</p>
                {link.guardian.email && <p className="mt-1 text-sm text-[#68707d]">{link.guardian.email}</p>}
              </div>
            ))}
          </div>
        </article>
      </section>
      <section className="card mt-5 overflow-hidden">
        <div className="border-b border-[#e5e7eb] p-5">
          <h2 className="text-lg font-black">Enrollment history</h2>
          <p className="text-sm text-[#68707d]">Every class movement remains available for reporting and audit.</p>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Session</th><th>Campus</th><th>Class</th><th>Period</th><th>Status</th></tr></thead>
            <tbody>
              {student.enrollments.map((enrollment) => (
                <tr key={enrollment.id}>
                  <td className="font-extrabold">{enrollment.academicSession.name}</td>
                  <td>{enrollment.campus.name}</td>
                  <td>{enrollment.classArm.classLevel.name} {enrollment.classArm.name}</td>
                  <td>{enrollment.startsOn.toLocaleDateString("en-NG")} — {enrollment.endsOn?.toLocaleDateString("en-NG") ?? "present"}</td>
                  <td><span className="pill" data-tone={enrollment.status === "CURRENT" ? "success" : undefined}>{enrollment.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card mt-5 overflow-hidden">
        <div className="border-b border-[#e5e7eb] p-5">
          <h2 className="text-lg font-black">Documents</h2>
          <p className="text-sm text-[#68707d]">Private files stored in Petra’s Supabase project.</p>
        </div>
        <div className="divide-y divide-[#e5e7eb]">
          {student.documents.map((document) => (
            <Link className="flex items-center gap-3 p-5 hover:bg-[#fafafa]" href={`/api/student-documents/${document.id}`} key={document.id}>
              <FileText className="text-[#d71920]" size={19} />
              <span className="min-w-0">
                <strong className="block truncate text-sm">{document.originalName}</strong>
                <small className="text-[#7b838e]">{document.category.replaceAll("_", " ")} · {(document.sizeBytes / 1024).toFixed(0)} KB · {document.uploadedBy.name}</small>
              </span>
            </Link>
          ))}
          {!student.documents.length && <div className="p-5 text-sm text-[#7b838e]">No documents uploaded.</div>}
        </div>
      </section>
      {canManage && (
        <section className="mt-5 grid gap-5 xl:grid-cols-3">
          <GuardianForm studentId={student.id} />
          <StudentStatusForm currentStatus={student.status} studentId={student.id} />
          <StudentDocumentForm studentId={student.id} />
        </section>
      )}
    </div>
  );
}

function Detail({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-[#d71920]">{icon}</span>
      <div><dt className="text-xs font-extrabold uppercase tracking-wide text-[#8a929d]">{label}</dt><dd className="mt-1 font-bold text-[#4f5865]">{value}</dd></div>
    </div>
  );
}

