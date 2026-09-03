import type { Metadata } from "next";
import { CalendarDays, ClipboardList, KeyRound, UsersRound } from "lucide-react";
import { updateApplicationStatus, updateVisitStatus } from "@/app/actions/admissions";
import { ApplicantAccountResetForm } from "@/components/applicant-account-reset-form";
import {
  applicationNextStatuses,
  applicationStatusLabel,
  type ApplicationStatus,
  type VisitStatus,
  visitNextStatuses,
} from "@/lib/admissions-rules";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Admissions management" };

type ApplicationRow = {
  id: string;
  applicationNumber: string;
  status: ApplicationStatus;
  studentFirstName: string | null;
  studentLastName: string | null;
  guardianFirstName: string;
  guardianLastName: string;
  email: string;
  phone: string;
  mustChangePassword: boolean;
  campusName: string | null;
  className: string | null;
  examMode: string | null;
  submittedAt: Date | null;
  createdAt: Date;
  documentCount: bigint;
};

type VisitRow = {
  id: string;
  status: VisitStatus;
  guardianName: string;
  studentName: string;
  phone: string;
  email: string | null;
  campusName: string | null;
  classInterest: string;
  preferredDate: Date;
  preferredTime: string;
  notes: string | null;
};

export default async function AdmissionsAdminPage() {
  const viewer = await requirePermission("admissions.read");
  const isOwner = viewer.membership.role === "OWNER";
  const campusId = viewer.membership.campusId;

  const [applications, visits] = await Promise.all([
    db.$queryRaw<ApplicationRow[]>`
      SELECT p."id", p."applicationNumber", p."status"::text AS "status",
        p."studentFirstName", p."studentLastName", a."firstName" AS "guardianFirstName",
        a."lastName" AS "guardianLastName", a."email", a."phone", a."mustChangePassword",
        c."name" AS "campusName", l."name" AS "className",
        p."examMode"::text AS "examMode", p."submittedAt", p."createdAt",
        COUNT(d."id")::bigint AS "documentCount"
      FROM "admission_applications" p
      JOIN "applicant_accounts" a ON a."id" = p."accountId"
      LEFT JOIN "campuses" c ON c."id" = p."campusId"
      LEFT JOIN "class_levels" l ON l."id" = p."classLevelId"
      LEFT JOIN "application_documents" d ON d."applicationId" = p."id"
      WHERE p."schoolId" = ${viewer.membership.schoolId}
        AND (${isOwner} OR p."campusId" = ${campusId})
      GROUP BY p."id", a."id", c."name", l."name"
      ORDER BY p."createdAt" DESC
      LIMIT 100
    `,
    db.$queryRaw<VisitRow[]>`
      SELECT v."id", v."status"::text AS "status", v."guardianName", v."studentName",
        v."phone", v."email", c."name" AS "campusName", v."classInterest",
        v."preferredDate", v."preferredTime", v."notes"
      FROM "visit_bookings" v
      LEFT JOIN "campuses" c ON c."id" = v."campusId"
      WHERE v."schoolId" = ${viewer.membership.schoolId}
        AND (${isOwner} OR v."campusId" = ${campusId})
      ORDER BY v."preferredDate" ASC, v."preferredTime" ASC
      LIMIT 100
    `,
  ]);

  const submittedCount = applications.filter((item) => item.status !== "DRAFT").length;
  const pendingVisits = visits.filter((item) => item.status === "REQUESTED").length;

  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">Phase 6A admissions</p>
        <h1 className="page-title">Applicants and school visits</h1>
        <p className="page-subtitle">Review submitted applications, move each record through the controlled admissions workflow and confirm requested campus visits.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="card p-5"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#fff0f1] text-[#b91118]"><UsersRound size={21} /></span><div><strong className="text-2xl">{applications.length}</strong><p className="text-sm text-[#6f7782]">Applicant accounts</p></div></div></article>
        <article className="card p-5"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#f1f4f7] text-[#414b58]"><ClipboardList size={21} /></span><div><strong className="text-2xl">{submittedCount}</strong><p className="text-sm text-[#6f7782]">Submitted applications</p></div></div></article>
        <article className="card p-5"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#eef8f3] text-[#14804a]"><CalendarDays size={21} /></span><div><strong className="text-2xl">{pendingVisits}</strong><p className="text-sm text-[#6f7782]">Visits awaiting confirmation</p></div></div></article>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-[#e5e7eb] p-5"><h2 className="text-xl font-black">Admission applications</h2><p className="mt-1 text-sm text-[#6f7782]">Drafts are visible for support, but only applicants can submit their form.</p></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Applicant</th><th>Placement</th><th>Status</th><th>Documents</th><th>Submitted</th><th>Actions</th></tr></thead>
            <tbody>
              {applications.map((application) => {
                const nextStatuses = applicationNextStatuses(application.status);
                return (
                  <tr key={application.id}>
                    <td><strong>{application.studentFirstName || "Draft"} {application.studentLastName || "application"}</strong><small className="block text-[#747c87]">{application.applicationNumber}</small><small className="block text-[#747c87]">{application.guardianFirstName} {application.guardianLastName} · {application.phone}</small><small className="block break-all text-[#747c87]">{application.email}</small></td>
                    <td>{application.campusName ?? "Not selected"}<small className="block text-[#747c87]">{application.className ?? "Class pending"} · {application.examMode ?? "Exam mode pending"}</small></td>
                    <td><span className="pill" data-tone={application.status === "ACCEPTED" ? "success" : "brand"}>{applicationStatusLabel(application.status)}</span>{application.mustChangePassword && <small className="mt-2 block font-bold text-[#a86b00]">Temporary password active</small>}</td>
                    <td>{Number(application.documentCount)}</td>
                    <td>{application.submittedAt ? application.submittedAt.toLocaleDateString("en-NG") : "Not submitted"}</td>
                    <td>
                      <div className="min-w-64 space-y-3">
                        {nextStatuses.length ? <form action={updateApplicationStatus.bind(null, application.id)} className="flex gap-2"><select name="status" required defaultValue=""><option value="" disabled>Select status</option>{nextStatuses.map((status) => <option key={status} value={status}>{applicationStatusLabel(status)}</option>)}</select><button className="button" type="submit">Update</button></form> : <span className="text-sm text-[#747c87]">No further workflow action</span>}
                        {isOwner && (
                          <details>
                            <summary className="button button-secondary cursor-pointer list-none"><KeyRound size={16} /> Reset applicant password</summary>
                            <div className="mt-3 min-w-[19rem] rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-lg">
                              <p className="mb-3 text-sm text-[#616a76]">This signs the applicant out everywhere and creates a one-time temporary password.</p>
                              <ApplicantAccountResetForm applicationId={application.id} />
                            </div>
                          </details>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!applications.length && <tr><td colSpan={6}><div className="empty-state">No applications have been created.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-[#e5e7eb] p-5"><h2 className="text-xl font-black">Visit requests</h2><p className="mt-1 text-sm text-[#6f7782]">Confirm the appointment before the family arrives.</p></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Family</th><th>Campus and class</th><th>Preferred time</th><th>Status</th><th>Next action</th></tr></thead>
            <tbody>
              {visits.map((visit) => {
                const nextStatuses = visitNextStatuses(visit.status);
                return (
                  <tr key={visit.id}>
                    <td><strong>{visit.guardianName}</strong><small className="block text-[#747c87]">Student: {visit.studentName}</small><small className="block text-[#747c87]">{visit.phone}{visit.email ? ` · ${visit.email}` : ""}</small></td>
                    <td>{visit.campusName ?? "Any campus"}<small className="block text-[#747c87]">{visit.classInterest}</small></td>
                    <td>{visit.preferredDate.toLocaleDateString("en-NG")}<small className="block text-[#747c87]">{visit.preferredTime}</small></td>
                    <td><span className="pill" data-tone={visit.status === "COMPLETED" ? "success" : "brand"}>{applicationStatusLabel(visit.status as never)}</span></td>
                    <td>{nextStatuses.length ? <form action={updateVisitStatus.bind(null, visit.id)} className="flex min-w-52 gap-2"><select name="status" required defaultValue=""><option value="" disabled>Select status</option>{nextStatuses.map((status) => <option key={status} value={status}>{applicationStatusLabel(status as never)}</option>)}</select><button className="button" type="submit">Update</button></form> : <span className="text-sm text-[#747c87]">No further action</span>}</td>
                  </tr>
                );
              })}
              {!visits.length && <tr><td colSpan={5}><div className="empty-state">No visit requests have been received.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
