import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  Send,
} from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import {
  StudentFeedbackForm,
  type FeedbackClassOption,
} from "@/components/student-feedback-form";
import { getViewer } from "@/lib/dal";
import { db } from "@/lib/db";
import { feedbackLabel } from "@/lib/student-feedback";
import { lagosDateInput } from "@/lib/teacher-workspace";

export const metadata: Metadata = { title: "Student feedback" };

function date(value: Date) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(value);
}

export default async function TeacherFeedbackPage() {
  const viewer = await getViewer();
  if (viewer.membership.role !== "TEACHER" || !viewer.membership.campusId) {
    redirect("/dashboard");
  }

  const [assignments, reports] = await Promise.all([
    db.teachingAssignment.findMany({
      where: {
        schoolId: viewer.membership.schoolId,
        campusId: viewer.membership.campusId,
        teacherMembershipId: viewer.membership.id,
        term: { isCurrent: true },
      },
      orderBy: [
        { classArm: { classLevel: { sortOrder: "asc" } } },
        { classArm: { name: "asc" } },
      ],
      select: {
        termId: true,
        classArmId: true,
        term: {
          select: {
            name: true,
            academicSession: { select: { name: true } },
          },
        },
        classArm: {
          select: {
            name: true,
            classLevel: { select: { name: true } },
            enrollments: {
              where: {
                status: "CURRENT",
                student: { status: "ACTIVE" },
              },
              orderBy: [
                { student: { lastName: "asc" } },
                { student: { firstName: "asc" } },
              ],
              select: {
                student: {
                  select: {
                    id: true,
                    admissionNumber: true,
                    firstName: true,
                    middleName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    db.studentFeedbackReport.findMany({
      where: {
        schoolId: viewer.membership.schoolId,
        teacherMembershipId: viewer.membership.id,
      },
      orderBy: [{ feedbackDate: "desc" }, { sentAt: "desc" }],
      take: 40,
    }),
  ]);

  const classMap = new Map<string, FeedbackClassOption>();
  for (const assignment of assignments) {
    const key = `${assignment.termId}:${assignment.classArmId}`;
    if (classMap.has(key)) continue;
    classMap.set(key, {
      termId: assignment.termId,
      classArmId: assignment.classArmId,
      label: `${assignment.classArm.classLevel.name} ${assignment.classArm.name} · ${assignment.term.academicSession.name} · ${assignment.term.name}`,
      students: assignment.classArm.enrollments.map(({ student }) => ({
        id: student.id,
        admissionNumber: student.admissionNumber,
        name: [student.firstName, student.middleName, student.lastName]
          .filter(Boolean)
          .join(" "),
      })),
    });
  }
  const classes = Array.from(classMap.values());
  const acknowledged = reports.filter(
    (report) => report.status === "ACKNOWLEDGED",
  ).length;
  const awaiting = reports.length - acknowledged;

  return (
    <div>
      <Link
        className="mb-4 inline-flex items-center gap-2 text-sm font-black text-[#6b7280] hover:text-[#b91118]"
        href="/teacher"
      >
        <ArrowLeft size={17} /> Teacher overview
      </Link>
      <PageHeading
        description="Send a private, structured daily report to a learner's linked parent or guardian and receive an acknowledgement back."
        eyebrow="Teacher workspace"
        title="Student feedback to parents"
      />

      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        <article className="card p-5">
          <Send className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-3xl">{reports.length}</strong>
          <p className="text-sm text-[#68707d]">Feedback reports sent</p>
        </article>
        <article className="card p-5">
          <Clock3 className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-3xl">{awaiting}</strong>
          <p className="text-sm text-[#68707d]">Awaiting parent response</p>
        </article>
        <article className="card p-5">
          <CheckCircle2 className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-3xl">{acknowledged}</strong>
          <p className="text-sm text-[#68707d]">Acknowledged by parents</p>
        </article>
      </section>

      <section className="card mt-5 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <MessageSquareText className="text-[#d71920]" size={23} />
          <div>
            <h2 className="text-xl font-black">Send today&apos;s feedback</h2>
            <p className="text-sm text-[#68707d]">
              This modernises Petra Academy&apos;s paper feedback sheet while keeping the same practical observations.
            </p>
          </div>
        </div>
        <div className="mt-5">
          {classes.length ? (
            <StudentFeedbackForm classes={classes} today={lagosDateInput()} />
          ) : (
            <div className="empty-state">
              No current-term class assignment is linked to this Teacher account.
            </div>
          )}
        </div>
      </section>

      <section className="mt-5 space-y-4">
        <div>
          <h2 className="text-xl font-black">Feedback history</h2>
          <p className="text-sm text-[#68707d]">
            Parent acknowledgements and comments appear here after they respond.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {reports.map((report) => (
            <article className="card p-5" key={report.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black">{report.studentNameSnapshot}</h3>
                  <p className="text-sm text-[#68707d]">
                    {report.classNameSnapshot} · {date(report.feedbackDate)}
                  </p>
                </div>
                <span
                  className="pill"
                  data-tone={
                    report.status === "ACKNOWLEDGED" ? "success" : "brand"
                  }
                >
                  {report.status === "ACKNOWLEDGED"
                    ? "Parent acknowledged"
                    : "Sent to parent"}
                </span>
              </div>

              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="font-black">Homework</dt><dd className="text-[#68707d]">{feedbackLabel("homeworkStatus", report.homeworkStatus)}</dd></div>
                <div><dt className="font-black">Feeding</dt><dd className="text-[#68707d]">{feedbackLabel("feedingStatus", report.feedingStatus)}</dd></div>
                <div><dt className="font-black">Conduct</dt><dd className="text-[#68707d]">{feedbackLabel("conductStatus", report.conductStatus)}</dd></div>
                <div><dt className="font-black">Participation</dt><dd className="text-[#68707d]">{feedbackLabel("classParticipationStatus", report.classParticipationStatus)}</dd></div>
                <div><dt className="font-black">Health</dt><dd className="text-[#68707d]">{feedbackLabel("healthStatus", report.healthStatus)}</dd></div>
                <div><dt className="font-black">Arrival</dt><dd className="text-[#68707d]">{feedbackLabel("arrivalStatus", report.arrivalStatus)}</dd></div>
              </dl>

              {(report.observationNote || report.teacherComment) && (
                <div className="mt-4 space-y-3 rounded-xl bg-[#f6f7f8] p-4 text-sm">
                  {report.observationNote && <p><strong>Observation:</strong> {report.observationNote}</p>}
                  {report.teacherComment && <p><strong>Teacher&apos;s comment:</strong> {report.teacherComment}</p>}
                </div>
              )}

              {report.status === "ACKNOWLEDGED" && (
                <div className="mt-4 rounded-xl border border-[#b8dfc5] bg-[#effaf2] p-4 text-sm text-[#155d31]">
                  <strong>Parent response</strong>
                  <p className="mt-1 whitespace-pre-wrap">
                    {report.parentComment || "Acknowledged without an additional comment."}
                  </p>
                  {report.acknowledgedAt && (
                    <p className="mt-2 text-xs font-bold opacity-75">
                      Received {report.acknowledgedAt.toLocaleString("en-NG")}
                    </p>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
        {!reports.length && (
          <div className="card empty-state">No feedback report has been sent yet.</div>
        )}
      </section>
    </div>
  );
}
