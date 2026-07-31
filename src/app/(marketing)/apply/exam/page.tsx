import type { Metadata } from "next";
import Link from "next/link";
import { Award, CalendarClock, CheckCircle2, ClipboardList, MapPin, TimerReset } from "lucide-react";
import { startApplicantExam } from "@/app/actions/entrance-exams";
import { requireApplicant } from "@/lib/applicant-auth";
import { ensureApplicantExamRegistration } from "@/lib/applicant-exam";
import { canStartOnlineExam, examLabel } from "@/lib/entrance-exam";

export const metadata: Metadata = { title: "Entrance examination" };

type ExamPageProps = {
  searchParams: Promise<{ completed?: string; error?: string }>;
};

export default async function ApplicantExamPage({ searchParams }: ExamPageProps) {
  const viewer = await requireApplicant();
  const { completed, error } = await searchParams;
  const registration = await ensureApplicantExamRegistration(viewer);
  const now = new Date();

  return (
    <section className="marketing-section exam-portal-section">
      <div className="marketing-shell applicant-exam-shell">
        <header className="applicant-toolbar">
          <div>
            <span className="section-kicker">Applicant portal</span>
            <h1>Entrance examination</h1>
            <p><strong>{viewer.applicationNumber}</strong></p>
          </div>
          <Link className="button button-secondary" href="/apply/status">Application status</Link>
        </header>

        {completed && (
          <div className="success-banner"><CheckCircle2 size={20} />Your examination was submitted and scored successfully.</div>
        )}
        {error && (
          <div className="form-alert">The examination could not be opened. Check the schedule below or contact the admissions office.</div>
        )}

        {!registration && (
          <article className="marketing-card exam-waiting-card">
            <CalendarClock size={34} />
            <h2>Examination schedule pending</h2>
            <p>
              Your fees are confirmed, but Petra Academy has not yet published an examination paper for your campus,
              class and selected examination mode. This page will update automatically when the schedule is ready.
            </p>
          </article>
        )}

        {registration && (
          <div className="exam-overview-grid">
            <article className="marketing-card exam-primary-card">
              <div className="exam-card-heading">
                <span className="application-status-badge" data-status={registration.status}>{examLabel(registration.status)}</span>
                <span>{examLabel(registration.mode)}</span>
              </div>
              <h2>{registration.title}</h2>
              <p className="exam-instructions">{registration.instructions}</p>

              {registration.status === "SCORED" && (
                <div className="exam-result-panel">
                  <Award size={32} />
                  <div>
                    <span>Examination result</span>
                    <strong>{Number(registration.score ?? 0).toLocaleString("en-NG")} / {Number(registration.maximumScore ?? 0).toLocaleString("en-NG")}</strong>
                    <p>{Number(registration.percentage ?? 0).toFixed(2)}% · {registration.passed ? "Pass mark reached" : "Below the current pass mark"}</p>
                  </div>
                </div>
              )}

              {registration.status === "ABSENT" && (
                <div className="form-alert">The onsite register records this candidate as absent. The admissions team will review the application.</div>
              )}

              {registration.mode === "ONLINE" && registration.status === "SCHEDULED" && (
                <>
                  <div className="exam-facts">
                    <div><TimerReset size={19} /><span>Duration</span><strong>{registration.durationMinutes} minutes</strong></div>
                    <div><ClipboardList size={19} /><span>Questions</span><strong>{registration.questionCount}</strong></div>
                    <div><Award size={19} /><span>Pass mark</span><strong>{Number(registration.passMark)}%</strong></div>
                  </div>
                  {canStartOnlineExam({
                    paperStatus: registration.paperStatus,
                    registrationStatus: registration.status,
                    opensAt: registration.opensAt,
                    closesAt: registration.closesAt,
                    now,
                  }) ? (
                    <form action={startApplicantExam}>
                      <button className="button exam-start-button" type="submit">Start examination</button>
                    </form>
                  ) : (
                    <div className="exam-schedule-note">
                      <CalendarClock size={21} />
                      <div>
                        <strong>Online window</strong>
                        <p>{registration.opensAt?.toLocaleString("en-NG")} – {registration.closesAt?.toLocaleString("en-NG")}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {registration.mode === "ONLINE" && registration.status === "IN_PROGRESS" && (
                <Link className="button exam-start-button" href="/apply/exam/take">Resume examination</Link>
              )}

              {registration.mode === "ONSITE" && registration.status === "SCHEDULED" && (
                <div className="onsite-exam-callout">
                  <CalendarClock size={24} />
                  <div><span>Date and time</span><strong>{registration.scheduledAt?.toLocaleString("en-NG")}</strong></div>
                  <MapPin size={24} />
                  <div><span>Venue</span><strong>{registration.venue}</strong></div>
                  <Link className="button" href="/apply/exam/slip">View examination slip</Link>
                </div>
              )}
            </article>

            <aside className="marketing-card exam-candidate-card">
              <h2>Candidate details</h2>
              <dl>
                <div><dt>Candidate number</dt><dd>{registration.candidateNumber}</dd></div>
                <div><dt>Seat number</dt><dd>{registration.seatNumber ?? "Online candidate"}</dd></div>
                <div><dt>Campus</dt><dd>{registration.campusName}</dd></div>
                <div><dt>Class</dt><dd>{registration.className}</dd></div>
                <div><dt>Mode</dt><dd>{examLabel(registration.mode)}</dd></div>
              </dl>
              {registration.mode === "ONSITE" && (
                <Link className="text-link" href="/api/exam-slips/download">Download PDF slip</Link>
              )}
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
