import type { Metadata } from "next";
import {
  CheckCircle2,
  Clock3,
  HeartHandshake,
  MessageSquareText,
} from "lucide-react";
import { ParentFeedbackResponseForm } from "@/components/parent-feedback-response-form";
import { db } from "@/lib/db";
import { requirePortalRole } from "@/lib/portal-auth";
import { feedbackLabel } from "@/lib/student-feedback";

export const metadata: Metadata = { title: "Teacher feedback" };

function date(value: Date) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(value);
}

export default async function ParentFeedbackPage() {
  const viewer = await requirePortalRole("PARENT");
  if (!viewer.guardianId) {
    return <div className="card empty-state">No guardian profile is linked to this account.</div>;
  }

  const links = await db.studentGuardian.findMany({
    where: {
      guardianId: viewer.guardianId,
      student: { schoolId: viewer.schoolId },
    },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
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
  });
  const studentIds = links.map((link) => link.student.id);
  const reports = studentIds.length
    ? await db.studentFeedbackReport.findMany({
        where: {
          schoolId: viewer.schoolId,
          studentId: { in: studentIds },
          status: { in: ["SENT", "ACKNOWLEDGED"] },
        },
        orderBy: [{ feedbackDate: "desc" }, { sentAt: "desc" }],
        take: 100,
      })
    : [];

  const acknowledged = reports.filter((report) => report.status === "ACKNOWLEDGED").length;
  const awaiting = reports.length - acknowledged;

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Home–school communication</p>
        <h1 className="page-title">Teacher feedback</h1>
        <p className="page-subtitle">
          Private daily observations for your linked children. Acknowledge each report and send a comment back to the Teacher.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="card p-5">
          <MessageSquareText className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-3xl">{reports.length}</strong>
          <p className="text-sm text-[#68707d]">Teacher reports received</p>
        </article>
        <article className="card p-5">
          <Clock3 className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-3xl">{awaiting}</strong>
          <p className="text-sm text-[#68707d]">Awaiting acknowledgement</p>
        </article>
        <article className="card p-5">
          <CheckCircle2 className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-3xl">{acknowledged}</strong>
          <p className="text-sm text-[#68707d]">Acknowledged</p>
        </article>
      </section>

      <section className="space-y-4">
        {reports.map((report) => (
          <article className="card p-5 sm:p-6" key={report.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#a30f15]">
                  {report.classNameSnapshot}
                </p>
                <h2 className="mt-1 text-xl font-black">{report.studentNameSnapshot}</h2>
                <p className="mt-1 text-sm text-[#68707d]">
                  {date(report.feedbackDate)} · Teacher: {report.teacherNameSnapshot}
                </p>
              </div>
              <span
                className="pill"
                data-tone={report.status === "ACKNOWLEDGED" ? "success" : "brand"}
              >
                {report.status === "ACKNOWLEDGED" ? "Acknowledged" : "New feedback"}
              </span>
            </div>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl bg-[#f6f7f8] p-3"><dt className="font-black">Homework</dt><dd className="mt-1 text-[#68707d]">{feedbackLabel("homeworkStatus", report.homeworkStatus)}</dd></div>
              <div className="rounded-xl bg-[#f6f7f8] p-3"><dt className="font-black">Feeding</dt><dd className="mt-1 text-[#68707d]">{feedbackLabel("feedingStatus", report.feedingStatus)}</dd></div>
              <div className="rounded-xl bg-[#f6f7f8] p-3"><dt className="font-black">Toilet</dt><dd className="mt-1 text-[#68707d]">{feedbackLabel("toiletStatus", report.toiletStatus)}</dd></div>
              <div className="rounded-xl bg-[#f6f7f8] p-3"><dt className="font-black">Classmates</dt><dd className="mt-1 text-[#68707d]">{feedbackLabel("peerRelationshipStatus", report.peerRelationshipStatus)}</dd></div>
              <div className="rounded-xl bg-[#f6f7f8] p-3"><dt className="font-black">Conduct and mood</dt><dd className="mt-1 text-[#68707d]">{feedbackLabel("conductStatus", report.conductStatus)}</dd></div>
              <div className="rounded-xl bg-[#f6f7f8] p-3"><dt className="font-black">Break time</dt><dd className="mt-1 text-[#68707d]">{feedbackLabel("breakTimeStatus", report.breakTimeStatus)}</dd></div>
              <div className="rounded-xl bg-[#f6f7f8] p-3"><dt className="font-black">Participation</dt><dd className="mt-1 text-[#68707d]">{feedbackLabel("classParticipationStatus", report.classParticipationStatus)}</dd></div>
              <div className="rounded-xl bg-[#f6f7f8] p-3"><dt className="font-black">Health</dt><dd className="mt-1 text-[#68707d]">{feedbackLabel("healthStatus", report.healthStatus)}</dd></div>
              <div className="rounded-xl bg-[#f6f7f8] p-3"><dt className="font-black">Arrival</dt><dd className="mt-1 text-[#68707d]">{feedbackLabel("arrivalStatus", report.arrivalStatus)}</dd></div>
            </dl>

            {(report.observationNote || report.teacherComment) && (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {report.observationNote && (
                  <div className="rounded-2xl border border-[#e5e7eb] p-4">
                    <strong className="text-sm">Observation note</strong>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5f6874]">{report.observationNote}</p>
                  </div>
                )}
                {report.teacherComment && (
                  <div className="rounded-2xl border border-[#f0d9da] bg-[#fff7f7] p-4">
                    <strong className="text-sm text-[#a30f15]">Teacher&apos;s comment</strong>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5f6874]">{report.teacherComment}</p>
                  </div>
                )}
              </div>
            )}

            <ParentFeedbackResponseForm
              acknowledged={report.status === "ACKNOWLEDGED"}
              existingComment={report.parentComment}
              feedbackId={report.id}
            />
          </article>
        ))}

        {!reports.length && (
          <div className="card p-8 text-center">
            <HeartHandshake className="mx-auto text-[#d71920]" size={30} />
            <h2 className="mt-4 text-xl font-black">No Teacher feedback yet</h2>
            <p className="mt-2 text-sm text-[#68707d]">
              Reports sent by Teachers for your linked children will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
