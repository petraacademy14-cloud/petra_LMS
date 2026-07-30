import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { ConfirmImportButton, StudentImportForm } from "@/components/student-forms";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Import students" };

export default async function StudentImportPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const viewer = await requirePermission("students.import");
  const { job: jobId } = await searchParams;
  const campusFilter =
    viewer.membership.role === "OWNER"
      ? {}
      : { id: viewer.membership.campusId ?? "__none__" };
  const [campuses, classArms, sessions, jobs, selectedJob] = await Promise.all([
    db.campus.findMany({
      where: { schoolId: viewer.membership.schoolId, isActive: true, ...campusFilter },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.classArm.findMany({
      where: { isActive: true, campus: { schoolId: viewer.membership.schoolId, ...campusFilter } },
      orderBy: [{ classLevel: { sortOrder: "asc" } }, { name: "asc" }],
      select: { id: true, campusId: true, name: true, campus: { select: { name: true } }, classLevel: { select: { name: true } } },
    }),
    db.academicSession.findMany({
      where: { schoolId: viewer.membership.schoolId },
      orderBy: { startsOn: "desc" },
      select: { id: true, name: true },
    }),
    db.studentImportJob.findMany({
      where: {
        schoolId: viewer.membership.schoolId,
        ...(viewer.membership.role === "OWNER" ? {} : { campusId: viewer.membership.campusId ?? "__none__" }),
      },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        sourceName: true,
        status: true,
        totalRows: true,
        validRows: true,
        invalidRows: true,
        importedRows: true,
        createdAt: true,
        campus: { select: { name: true } },
        classArm: { select: { name: true, classLevel: { select: { name: true } } } },
      },
    }),
    jobId
      ? db.studentImportJob.findFirst({
          where: {
            id: jobId,
            schoolId: viewer.membership.schoolId,
            ...(viewer.membership.role === "OWNER" ? {} : { campusId: viewer.membership.campusId ?? "__none__" }),
          },
          select: {
            id: true,
            sourceName: true,
            status: true,
            totalRows: true,
            validRows: true,
            invalidRows: true,
            rows: {
              where: { isValid: false },
              orderBy: { rowNumber: "asc" },
              take: 200,
              select: { id: true, rowNumber: true, data: true, errors: true },
            },
          },
        })
      : null,
  ]);

  return (
    <div>
      <PageHeading
        eyebrow="Data migration"
        title="Excel / CSV student import"
        description="Validate Petra’s existing records before any database write. Invalid batches remain staged for review and import zero students."
        action={
          <a className="button button-secondary" download href="/student-import-template.csv">
            <Download size={17} /> Download template
          </a>
        }
      />
      <StudentImportForm
        campuses={campuses}
        classArms={classArms.map((arm) => ({
          id: arm.id,
          campusId: arm.campusId,
          name: `${arm.classLevel.name} ${arm.name} · ${arm.campus.name}`,
        }))}
        sessions={sessions}
      />
      {selectedJob && (
        <section className="card mt-5 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-[#e5e7eb] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">Validation result</p>
              <h2 className="mt-1 text-lg font-black">{selectedJob.sourceName}</h2>
              <p className="mt-1 text-sm text-[#68707d]">
                {selectedJob.validRows} valid · {selectedJob.invalidRows} invalid · {selectedJob.totalRows} total
              </p>
            </div>
            {selectedJob.status === "READY" ? (
              <ConfirmImportButton jobId={selectedJob.id} />
            ) : selectedJob.status === "COMPLETED" ? (
              <span className="pill" data-tone="success"><CheckCircle2 size={14} /> Imported</span>
            ) : (
              <span className="pill" data-tone="brand"><AlertTriangle size={14} /> Correct and upload again</span>
            )}
          </div>
          {selectedJob.rows.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Row</th><th>Student</th><th>Errors</th></tr></thead>
                <tbody>
                  {selectedJob.rows.map((row) => {
                    const data = row.data as Record<string, string>;
                    const errors = row.errors as Record<string, string[]> | null;
                    return (
                      <tr key={row.id}>
                        <td>{row.rowNumber}</td>
                        <td>{data.first_name} {data.last_name}</td>
                        <td className="max-w-xl whitespace-normal text-sm text-[#a80f15]">
                          {errors ? Object.entries(errors).flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`)).join(" · ") : "Invalid row"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      <section className="card mt-5 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[#e5e7eb] p-5">
          <FileSpreadsheet className="text-[#d71920]" size={21} />
          <h2 className="font-black">Recent import batches</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>File</th><th>Campus / class</th><th>Rows</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td><Link className="font-extrabold text-[#b91118] hover:underline" href={`/students/import?job=${job.id}`}>{job.sourceName}</Link></td>
                  <td>{job.campus.name} · {job.classArm.classLevel.name} {job.classArm.name}</td>
                  <td>{job.importedRows || `${job.validRows}/${job.totalRows} valid`}</td>
                  <td><span className="pill" data-tone={job.status === "COMPLETED" ? "success" : job.status === "FAILED" ? "brand" : undefined}>{job.status}</span></td>
                  <td>{job.createdAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!jobs.length && <div className="empty-state">No import batches yet.</div>}
      </section>
    </div>
  );
}

