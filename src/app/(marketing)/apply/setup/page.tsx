import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CreditCard, ShieldCheck } from "lucide-react";
import { prepareApplicationFee } from "@/app/actions/applicant-finance";
import { requireApplicant } from "@/lib/applicant-auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Application setup" };

type SetupPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ApplicationSetupPage({ searchParams }: SetupPageProps) {
  const viewer = await requireApplicant();
  const query = await searchParams;
  const [application] = await db.$queryRaw<Array<{
    status: string;
    submittedAt: Date | null;
    campusId: string | null;
    classLevelId: string | null;
    studentFirstName: string | null;
    studentLastName: string | null;
    examMode: "ONLINE" | "ONSITE" | null;
  }>>`
    SELECT "status"::text AS "status", "submittedAt", "campusId", "classLevelId",
      "studentFirstName", "studentLastName", "examMode"::text AS "examMode"
    FROM "admission_applications"
    WHERE "id"=${viewer.applicationId} AND "accountId"=${viewer.id}
    LIMIT 1
  `;
  if (!application) throw new Error("NOT_FOUND:APPLICATION");

  if (application.status !== "DRAFT" || application.submittedAt) {
    return (
      <section className="marketing-section application-form-section">
        <div className="marketing-shell narrow-form-shell">
          <article className="marketing-card status-main-card">
            <span className="section-kicker">Application already started</span>
            <h1>Continue from your applicant portal.</h1>
            <p>Your campus, class and payment stage have already been created.</p>
            <Link className="button" href="/apply/status">View application status</Link>
          </article>
        </div>
      </section>
    );
  }

  const [campuses, classLevels] = await Promise.all([
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
  ]);

  return (
    <section className="marketing-section application-form-section">
      <div className="marketing-shell narrow-form-shell">
        <Link className="back-link" href="/apply"><ArrowLeft size={17} /> Back to applications</Link>
        <div className="form-intro">
          <span className="section-kicker">Application setup</span>
          <h1>Select the campus and class.</h1>
          <p>
            We use these details to display the correct application-form fee. The complete application form
            unlocks only after Petra Academy verifies the payment.
          </p>
        </div>

        {query.error === "fee-not-configured" && (
          <div className="error-banner" role="alert">
            The application-form fee has not been configured for that campus and class. Please contact admissions.
          </div>
        )}
        {query.error === "invalid-placement" && (
          <div className="error-banner" role="alert">
            That class is not currently available at the selected campus. Please choose another placement.
          </div>
        )}

        <form action={prepareApplicationFee} className="marketing-form marketing-card">
          <div className="field-grid">
            <label><span>Student first name *</span><input name="studentFirstName" required minLength={2} maxLength={80} defaultValue={application.studentFirstName ?? ""} /></label>
            <label><span>Student last name *</span><input name="studentLastName" required minLength={2} maxLength={80} defaultValue={application.studentLastName ?? ""} /></label>
            <label>
              <span>Preferred campus *</span>
              <select name="campusId" required defaultValue={application.campusId ?? ""}>
                <option value="" disabled>Select campus</option>
                {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name} — {campus.city}</option>)}
              </select>
            </label>
            <label>
              <span>Class applying for *</span>
              <select name="classLevelId" required defaultValue={application.classLevelId ?? ""}>
                <option value="" disabled>Select class</option>
                {classLevels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
              </select>
            </label>
            <label className="field-full">
              <span>Preferred entrance examination method *</span>
              <select name="examMode" required defaultValue={application.examMode ?? ""}>
                <option value="" disabled>Select examination method</option>
                <option value="ONLINE">Online examination</option>
                <option value="ONSITE">Onsite examination</option>
              </select>
            </label>
          </div>

          <div className="security-note">
            <CreditCard size={19} />
            <span>After continuing, you will see the application-form fee and approved payment instructions.</span>
          </div>
          <div className="security-note">
            <ShieldCheck size={19} />
            <span>Uploading or entering payment evidence does not unlock the form. Admissions must verify the money received.</span>
          </div>
          <button className="button button-lg" type="submit">Continue to application-form payment</button>
        </form>
      </div>
    </section>
  );
}
