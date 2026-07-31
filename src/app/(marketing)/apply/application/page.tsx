import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, FileUp, LogOut, Save } from "lucide-react";
import {
  logoutApplicant,
  saveApplication,
  submitApplication,
} from "@/app/actions/admissions";
import { applicationStatusLabel, isEditableApplication, type ApplicationStatus } from "@/lib/admissions-rules";
import { requireApplicant } from "@/lib/applicant-auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Application" };

type ApplicationRow = {
  campusId: string | null;
  classLevelId: string | null;
  studentFirstName: string | null;
  studentMiddleName: string | null;
  studentLastName: string | null;
  preferredName: string | null;
  gender: "MALE" | "FEMALE" | null;
  dateOfBirth: Date | null;
  address: string | null;
  previousSchool: string | null;
  medicalNotes: string | null;
  examMode: "ONLINE" | "ONSITE" | null;
  termsAccepted: boolean;
  status: ApplicationStatus;
};

type ApplicationPageProps = {
  searchParams: Promise<{ created?: string; saved?: string; error?: string }>;
};

export default async function ApplicationPage({ searchParams }: ApplicationPageProps) {
  const viewer = await requireApplicant();
  const params = await searchParams;
  const [application] = await db.$queryRaw<ApplicationRow[]>`
    SELECT "campusId", "classLevelId", "studentFirstName", "studentMiddleName",
      "studentLastName", "preferredName", "gender"::text AS "gender", "dateOfBirth",
      "address", "previousSchool", "medicalNotes", "examMode"::text AS "examMode",
      "termsAccepted", "status"::text AS "status"
    FROM "admission_applications"
    WHERE "id" = ${viewer.applicationId} AND "accountId" = ${viewer.id}
    LIMIT 1
  `;
  if (!application) throw new Error("NOT_FOUND:APPLICATION");

  const [campuses, classLevels, documentCountRows] = await Promise.all([
    db.campus.findMany({
      where: { schoolId: viewer.schoolId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, city: true },
    }),
    db.classLevel.findMany({
      where: { schoolId: viewer.schoolId, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count"
      FROM "application_documents"
      WHERE "applicationId" = ${viewer.applicationId}
    `,
  ]);
  const editable = isEditableApplication(application.status);
  const documentCount = Number(documentCountRows[0]?.count ?? 0);

  return (
    <section className="marketing-section applicant-workspace-section">
      <div className="marketing-shell applicant-workspace-shell">
        <div className="applicant-toolbar">
          <div>
            <span className="section-kicker">Applicant portal</span>
            <h1>{viewer.firstName} {viewer.lastName}</h1>
            <p>Application <strong>{viewer.applicationNumber}</strong></p>
          </div>
          <div className="applicant-toolbar-actions">
            <span className="application-status-badge" data-status={application.status}>{applicationStatusLabel(application.status)}</span>
            <form action={logoutApplicant}><button className="button button-secondary" type="submit"><LogOut size={17} /> Sign out</button></form>
          </div>
        </div>

        {(params.created || params.saved) && (
          <div className="success-banner"><CheckCircle2 size={20} />{params.created ? "Your applicant account is ready. Complete the application below." : "Application draft saved."}</div>
        )}
        {params.error === "incomplete" && (
          <div className="form-alert">Complete all required fields and accept the declaration before submitting.</div>
        )}

        {!editable && (
          <div className="marketing-card locked-application-card">
            <h2>Your application has been submitted</h2>
            <p>The form is now locked to preserve the submitted record. Follow payment, examination and decision updates from the status page.</p>
            <Link className="button" href="/apply/status">View application status</Link>
          </div>
        )}

        <div className="application-workspace-grid">
          <form action={saveApplication} className="marketing-form marketing-card application-details-form">
            <div className="form-heading">
              <div><span className="section-kicker">Student details</span><h2>Admission application</h2></div>
              <span>{editable ? "Save as often as needed" : "Submitted record"}</span>
            </div>
            <fieldset disabled={!editable}>
              <div className="field-grid">
                <label><span>First name *</span><input defaultValue={application.studentFirstName ?? ""} name="studentFirstName" required /></label>
                <label><span>Middle name</span><input defaultValue={application.studentMiddleName ?? ""} name="studentMiddleName" /></label>
                <label><span>Last name *</span><input defaultValue={application.studentLastName ?? ""} name="studentLastName" required /></label>
                <label><span>Preferred name</span><input defaultValue={application.preferredName ?? ""} name="preferredName" /></label>
                <label><span>Gender *</span><select defaultValue={application.gender ?? ""} name="gender" required><option value="" disabled>Select gender</option><option value="MALE">Male</option><option value="FEMALE">Female</option></select></label>
                <label><span>Date of birth *</span><input defaultValue={application.dateOfBirth?.toISOString().slice(0, 10) ?? ""} name="dateOfBirth" required type="date" /></label>
                <label><span>Preferred campus *</span><select defaultValue={application.campusId ?? ""} name="campusId" required><option value="" disabled>Select campus</option>{campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name} — {campus.city}</option>)}</select></label>
                <label><span>Class applying for *</span><select defaultValue={application.classLevelId ?? ""} name="classLevelId" required><option value="" disabled>Select class</option>{classLevels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}</select></label>
                <label className="field-full"><span>Home address *</span><textarea defaultValue={application.address ?? ""} name="address" required rows={4} /></label>
                <label><span>Previous school</span><input defaultValue={application.previousSchool ?? ""} name="previousSchool" /></label>
                <label><span>Entrance examination mode *</span><select defaultValue={application.examMode ?? ""} name="examMode" required><option value="" disabled>Select mode</option><option value="ONLINE">Online examination</option><option value="ONSITE">Onsite examination</option></select></label>
                <label className="field-full"><span>Medical, learning or support information</span><textarea defaultValue={application.medicalNotes ?? ""} name="medicalNotes" rows={5} /></label>
                <label className="field-full checkbox-field"><input defaultChecked={application.termsAccepted} name="termsAccepted" type="checkbox" /><span>I confirm that the information provided is accurate and may be used for Petra Academy’s admission process. *</span></label>
              </div>
            </fieldset>
            {editable && <button className="button button-lg" type="submit"><Save size={18} /> Save application</button>}
          </form>

          <aside className="application-side-panel">
            <div className="marketing-card application-step-card">
              <span className="section-kicker">Documents</span>
              <h2>{documentCount} uploaded</h2>
              <p>Add a passport photograph, birth certificate, previous result or other requested admission evidence.</p>
              <Link className="button button-secondary" href="/apply/documents"><FileUp size={18} /> Manage documents</Link>
            </div>
            <div className="marketing-card application-step-card">
              <span className="section-kicker">Submission</span>
              <h2>Ready for review?</h2>
              <p>Submitting locks the current form. Entrance payment and examination instructions follow after submission.</p>
              {editable ? <form action={submitApplication}><button className="button button-lg" type="submit">Submit application</button></form> : <Link className="button" href="/apply/status">View status</Link>}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
