import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock3, FileText, LogOut } from "lucide-react";
import { logoutApplicant } from "@/app/actions/admissions";
import { applicationStatusLabel, type ApplicationStatus } from "@/lib/admissions-rules";
import { requireApplicant } from "@/lib/applicant-auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Application status" };

type StatusRow = {
  status: ApplicationStatus;
  studentFirstName: string | null;
  studentLastName: string | null;
  campusName: string | null;
  className: string | null;
  examMode: "ONLINE" | "ONSITE" | null;
  submittedAt: Date | null;
};

const statusOrder: ApplicationStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "AWAITING_PAYMENT",
  "AWAITING_EXAMINATION",
  "UNDER_REVIEW",
  "ACCEPTED",
];

const guidance: Record<ApplicationStatus, string> = {
  DRAFT: "Complete the form, upload supporting documents and submit the application.",
  SUBMITTED: "The admissions team has received the application and will confirm the entrance-payment stage.",
  AWAITING_PAYMENT: "Entrance fee details will appear in the next admissions sprint. The school may also provide payment instructions directly.",
  AWAITING_EXAMINATION: "The entrance examination has been unlocked. Online or onsite instructions will appear here.",
  UNDER_REVIEW: "The examination and application are being reviewed by the admissions team.",
  ACCEPTED: "Congratulations. Admission and acceptance documents will be available from this portal.",
  WAITLISTED: "The application remains active on the waiting list. The school will communicate any change.",
  REJECTED: "The current application was not successful. Contact the admissions office for clarification.",
};

type StatusPageProps = { searchParams: Promise<{ submitted?: string }> };

export default async function ApplicationStatusPage({ searchParams }: StatusPageProps) {
  const viewer = await requireApplicant();
  const { submitted } = await searchParams;
  const [application] = await db.$queryRaw<StatusRow[]>`
    SELECT p."status"::text AS "status", p."studentFirstName", p."studentLastName",
      c."name" AS "campusName", l."name" AS "className",
      p."examMode"::text AS "examMode", p."submittedAt"
    FROM "admission_applications" p
    LEFT JOIN "campuses" c ON c."id" = p."campusId"
    LEFT JOIN "class_levels" l ON l."id" = p."classLevelId"
    WHERE p."id" = ${viewer.applicationId} AND p."accountId" = ${viewer.id}
    LIMIT 1
  `;
  if (!application) throw new Error("NOT_FOUND:APPLICATION");
  const currentIndex = statusOrder.indexOf(application.status);

  return (
    <section className="marketing-section applicant-workspace-section">
      <div className="marketing-shell applicant-status-shell">
        <div className="applicant-toolbar">
          <div><span className="section-kicker">Applicant portal</span><h1>Application status</h1><p><strong>{viewer.applicationNumber}</strong></p></div>
          <form action={logoutApplicant}><button className="button button-secondary" type="submit"><LogOut size={17} /> Sign out</button></form>
        </div>
        {submitted && <div className="success-banner"><CheckCircle2 size={20} />Your application has been submitted successfully.</div>}

        <div className="status-summary-grid">
          <article className="marketing-card status-main-card">
            <span className="application-status-badge" data-status={application.status}>{applicationStatusLabel(application.status)}</span>
            <h2>{application.studentFirstName} {application.studentLastName}</h2>
            <p>{application.campusName ?? "Campus pending"} · {application.className ?? "Class pending"}</p>
            <div className="status-guidance"><Clock3 size={22} /><div><strong>What happens next</strong><p>{guidance[application.status]}</p></div></div>
            {application.status === "DRAFT" && <Link className="button" href="/apply/application">Continue application</Link>}
          </article>
          <aside className="marketing-card status-detail-card">
            <h2>Application details</h2>
            <dl>
              <div><dt>Application number</dt><dd>{viewer.applicationNumber}</dd></div>
              <div><dt>Exam preference</dt><dd>{application.examMode ? applicationStatusLabel(application.examMode as never) : "Not selected"}</dd></div>
              <div><dt>Submitted</dt><dd>{application.submittedAt ? application.submittedAt.toLocaleString("en-NG") : "Not submitted"}</dd></div>
            </dl>
            <Link className="text-link" href="/apply/documents"><FileText size={17} /> View submitted documents</Link>
          </aside>
        </div>

        {!(["WAITLISTED", "REJECTED"] as ApplicationStatus[]).includes(application.status) && (
          <div className="application-timeline marketing-card">
            {statusOrder.map((status, index) => {
              const complete = currentIndex >= index && currentIndex !== -1;
              const active = application.status === status;
              return <div className="timeline-step" data-active={active} data-complete={complete} key={status}><span>{complete ? <CheckCircle2 size={19} /> : index + 1}</span><strong>{applicationStatusLabel(status)}</strong></div>;
            })}
          </div>
        )}
      </div>
    </section>
  );
}
