import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  GraduationCap,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { StudentStatus } from "@/generated/prisma/enums";
import { changeStudentStatus } from "@/app/actions/students";
import { PageHeading } from "@/components/page-heading";
import {
  AddGuardianForm,
  DocumentUploadForm,
  StudentReactivationForm,
} from "@/components/student-forms";
import { requireCampusAccess, requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "Student profile" };

function date(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(value)
    : "Not provided";
}

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const viewer = await requirePermission("people.read");
  const { studentId } = await params;
  const student = await db.student.findFirst({
    where: { id: studentId, schoolId: viewer.membership.schoolId },
    include: {
      campus: { select: { name: true, code: true } },
      guardians: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        include: { guardian: true },
      },
      enrollments: {
        orderBy: { startsOn: "desc" },
        include: {
          academicSession: { select: { name: true } },
          classArm: {
            select: {
              name: true,
              classLevel: { select: { name: true } },
            },
          },
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { name: true } } },
      },
    },
  });
  if (!student) notFound();
  await requireCampusAccess(student.campusId);
  const canManage = hasPermission(viewer.membership.role, "people.manage");
  const needsPlacement =
    student.status === "WITHDRAWN" || student.status === "GRADUATED";
  const [campuses, classArms, sessions] =
    canManage && needsPlacement
      ? await Promise.all([
          db.campus.findMany({
            where: {
              schoolId: viewer.membership.schoolId,
              isActive: true,
              ...(viewer.membership.role === "OWNER"
                ? {}
                : { id: viewer.membership.campusId ?? "__none__" }),
            },
            orderBy: { name: "asc" },
            select: { id: true, name: true, code: true },
          }),
          db.classArm.findMany({
            where: {
              isActive: true,
              campus: {
                schoolId: viewer.membership.schoolId,
                ...(viewer.membership.role === "OWNER"
                  ? {}
                  : { id: viewer.membership.campusId ?? "__none__" }),
              },
            },
            orderBy: [
              { classLevel: { sortOrder: "asc" } },
              { campus: { name: "asc" } },
              { name: "asc" },
            ],
            select: {
              id: true,
              name: true,
              campus: { select: { name: true } },
              classLevel: { select: { name: true } },
            },
          }),
          db.academicSession.findMany({
            where: { schoolId: viewer.membership.schoolId },
            orderBy: { startsOn: "desc" },
            select: { id: true, name: true },
          }),
        ])
      : [[], [], []];

  const campusOptions = campuses.map((campus) => ({
    value: campus.id,
    label: `${campus.name} (${campus.code})`,
  }));
  const classOptions = classArms.map((arm) => ({
    value: arm.id,
    label: `${arm.campus.name} · ${arm.classLevel.name} ${arm.name}`,
  }));
  const sessionOptions = sessions.map((session) => ({
    value: session.id,
    label: session.name,
  }));

  return (
    <div>
      <PageHeading
        action={
          <Link className="button-secondary" href="/students">
            <ArrowLeft size={17} /> Student register
          </Link>
        }
        description={`${student.admissionNumber} · ${student.campus.name}`}
        eyebrow="Student profile"
        title={`${student.firstName} ${student.middleName ?? ""} ${student.lastName}`}
      />

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card p-5">
          <p className="eyebrow">Status</p>
          <span
            className="pill mt-3"
            data-tone={student.status === "ACTIVE" ? "success" : undefined}
          >
            {student.status}
          </span>
        </article>
        <article className="card p-5">
          <p className="eyebrow">Campus</p>
          <p className="mt-3 flex items-center gap-2 font-black">
            <MapPin className="text-[#d71920]" size={18} />
            {student.campus.name}
          </p>
        </article>
        <article className="card p-5">
          <p className="eyebrow">Date of birth</p>
          <p className="mt-3 font-black">{date(student.dateOfBirth)}</p>
        </article>
        <article className="card p-5">
          <p className="eyebrow">Admission date</p>
          <p className="mt-3 font-black">{date(student.admissionDate)}</p>
        </article>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[#e8eaed] p-5">
            <Users className="text-[#d71920]" size={21} />
            <div>
              <h2 className="font-black">Guardians</h2>
              <p className="text-xs text-[#747c87]">
                Multiple contacts and pickup permissions
              </p>
            </div>
          </div>
          <div className="divide-y divide-[#eceef1]">
            {student.guardians.map((link) => (
              <article className="p-5" key={link.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black">
                      {link.guardian.firstName} {link.guardian.lastName}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-[#626b77]">
                      <Phone size={14} /> {link.guardian.phone}
                    </p>
                    {link.guardian.email && (
                      <p className="mt-1 text-sm text-[#626b77]">
                        {link.guardian.email}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="pill">{link.relationship}</span>
                    {link.isPrimary && (
                      <span className="pill" data-tone="brand">
                        Primary
                      </span>
                    )}
                    {link.canPickup && (
                      <span className="pill" data-tone="success">
                        Pickup
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {canManage && (
            <details className="border-t border-[#e8eaed] p-5">
              <summary className="cursor-pointer font-black">
                Add another guardian
              </summary>
              <div className="mt-5">
                <AddGuardianForm studentId={student.id} />
              </div>
            </details>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[#e8eaed] p-5">
            <GraduationCap className="text-[#d71920]" size={21} />
            <div>
              <h2 className="font-black">Enrolment history</h2>
              <p className="text-xs text-[#747c87]">
                Every class placement is retained
              </p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Class</th>
                  <th>Status</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {student.enrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td>{enrollment.academicSession.name}</td>
                    <td>
                      {enrollment.classArm.classLevel.name}{" "}
                      {enrollment.classArm.name}
                    </td>
                    <td>
                      <span
                        className="pill"
                        data-tone={
                          enrollment.status === "CURRENT"
                            ? "success"
                            : undefined
                        }
                      >
                        {enrollment.status}
                      </span>
                    </td>
                    <td>{date(enrollment.startsOn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center gap-3">
            <FileText className="text-[#d71920]" size={21} />
            <div>
              <h2 className="font-black">Documents</h2>
              <p className="text-xs text-[#747c87]">
                Optional PDF or image attachments
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {student.documents.map((document) => (
              <article
                className="rounded-xl border border-[#e5e7ea] p-3"
                key={document.id}
              >
                <p className="font-extrabold">{document.name}</p>
                <p className="mt-1 text-xs text-[#737b86]">
                  {document.fileName} ·{" "}
                  {(document.sizeBytes / 1024).toFixed(0)} KB · uploaded by{" "}
                  {document.uploadedBy.name}
                </p>
              </article>
            ))}
            {!student.documents.length && (
              <p className="empty-state">No documents uploaded.</p>
            )}
          </div>
          {canManage && (
            <details className="mt-4 border-t border-[#e8eaed] pt-4">
              <summary className="cursor-pointer font-black">
                Upload a document
              </summary>
              <div className="mt-4">
                <DocumentUploadForm studentId={student.id} />
              </div>
            </details>
          )}
        </section>

        {canManage && (
          <section className="card p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-[#d71920]" size={21} />
              <div>
                <h2 className="font-black">Record status</h2>
                <p className="text-xs text-[#747c87]">
                  Status changes are audited; records are never deleted
                </p>
              </div>
            </div>
            <div className="mt-5">
              <div className="flex flex-wrap gap-2">
                {(
                  student.status === "ARCHIVED"
                    ? (["ACTIVE", "WITHDRAWN", "GRADUATED"] as StudentStatus[])
                    : (["ARCHIVED", "WITHDRAWN", "GRADUATED"] as StudentStatus[])
                )
                  .filter((status) => status !== student.status)
                  .map((status) => {
                    const action = changeStudentStatus.bind(
                      null,
                      student.id,
                      status,
                    );
                    return (
                      <form action={action} key={status}>
                        <button className="button-secondary" type="submit">
                          Mark {status.toLowerCase()}
                        </button>
                      </form>
                    );
                  })}
              </div>
              {needsPlacement && (
                <details className="mt-5 border-t border-[#e8eaed] pt-5" open>
                  <summary className="cursor-pointer font-black">
                    Reactivate with a new class placement
                  </summary>
                  <div className="mt-4">
                    <StudentReactivationForm
                      campuses={campusOptions}
                      classArms={classOptions}
                      sessions={sessionOptions}
                      studentId={student.id}
                    />
                  </div>
                </details>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
