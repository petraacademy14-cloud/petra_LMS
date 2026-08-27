import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  Clock3,
  Megaphone,
  Send,
} from "lucide-react";
import {
  createTeacherAnnouncement,
  submitTeacherAnnouncement,
} from "@/app/actions/teacher-communications";
import { PageHeading } from "@/components/page-heading";
import { getViewer } from "@/lib/dal";
import { db } from "@/lib/db";
import {
  teacherStatusTone,
  uniqueTeachingClasses,
} from "@/lib/teacher-workspace";

export const metadata: Metadata = { title: "Teacher communications" };

export default async function TeacherCommunicationsPage() {
  const viewer = await getViewer();
  if (viewer.membership.role !== "TEACHER") redirect("/communications");

  const [assignments, announcements] = await Promise.all([
    db.teachingAssignment.findMany({
      where: {
        schoolId: viewer.membership.schoolId,
        campusId: viewer.membership.campusId ?? "__none__",
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
          },
        },
      },
    }),
    db.announcement.findMany({
      where: {
        schoolId: viewer.membership.schoolId,
        authorId: viewer.user.id,
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        body: true,
        status: true,
        parentFacing: true,
        scheduledFor: true,
        updatedAt: true,
        classArm: {
          select: {
            name: true,
            classLevel: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const teachingClasses = uniqueTeachingClasses(assignments);
  const drafts = announcements.filter(
    (announcement) => announcement.status === "DRAFT",
  ).length;
  const inReview = announcements.filter(
    (announcement) => announcement.status === "IN_REVIEW",
  ).length;
  const published = announcements.filter((announcement) =>
    ["PUBLISHED", "ARCHIVED"].includes(announcement.status),
  ).length;

  return (
    <div>
      <Link
        className="mb-4 inline-flex items-center gap-2 text-sm font-black text-[#6b7280] hover:text-[#b91118]"
        href="/teacher"
      >
        <ArrowLeft size={17} /> Teacher overview
      </Link>
      <PageHeading
        description="Draft notices only for classes assigned to you. Administrators review and publish every message."
        eyebrow="Teacher workspace"
        title="Class communications"
      />

      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        <article className="card p-5">
          <Clock3 className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-3xl">{drafts}</strong>
          <p className="text-sm text-[#68707d]">Draft notices</p>
        </article>
        <article className="card p-5">
          <Send className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-3xl">{inReview}</strong>
          <p className="text-sm text-[#68707d]">Waiting for review</p>
        </article>
        <article className="card p-5">
          <CheckCircle2 className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-3xl">{published}</strong>
          <p className="text-sm text-[#68707d]">Published or archived</p>
        </article>
      </section>

      <section className="card mt-5 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Megaphone className="text-[#d71920]" size={22} />
          <div>
            <h2 className="text-xl font-black">Create a class notice</h2>
            <p className="text-sm text-[#68707d]">
              The notice remains a draft until you submit it for review.
            </p>
          </div>
        </div>

        {teachingClasses.length ? (
          <form action={createTeacherAnnouncement} className="mt-5 grid gap-4">
            <label className="grid gap-1 text-sm font-black">
              Assigned class
              <select
                className="h-12 rounded-xl border border-[#dfe2e6] px-3 font-normal"
                name="classArmId"
                required
              >
                <option value="">Choose class</option>
                {teachingClasses.map((assignment) => (
                  <option
                    key={`${assignment.termId}:${assignment.classArmId}`}
                    value={assignment.classArmId}
                  >
                    {assignment.classArm.classLevel.name}{" "}
                    {assignment.classArm.name} ·{" "}
                    {assignment.term.academicSession.name} ·{" "}
                    {assignment.term.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-black">
              Title
              <input
                className="h-12 rounded-xl border border-[#dfe2e6] px-3 font-normal"
                maxLength={160}
                name="title"
                placeholder="e.g. Mathematics revision reminder"
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-black">
              Message
              <textarea
                className="min-h-36 rounded-xl border border-[#dfe2e6] p-3 font-normal"
                maxLength={5000}
                name="body"
                placeholder="Write the message families should receive after approval."
                required
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-black">
                Release time
                <input
                  className="h-12 rounded-xl border border-[#dfe2e6] px-3 font-normal"
                  name="scheduledFor"
                  type="datetime-local"
                />
              </label>
              <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[#dfe2e6] px-3 text-sm font-bold">
                <input defaultChecked name="parentFacing" type="checkbox" />
                Show in parent and student portals after publication
              </label>
            </div>
            <button className="button w-fit" type="submit">
              Save draft notice
            </button>
          </form>
        ) : (
          <div className="empty-state mt-5">
            No current-term class assignment is linked to your account.
          </div>
        )}
      </section>

      <section className="card mt-5 overflow-hidden">
        <div className="border-b border-[#e8eaed] p-5">
          <h2 className="font-black">Your class notices</h2>
          <p className="text-sm text-[#68707d]">
            You can submit drafts for review. Review, publication and archiving
            remain administrator actions.
          </p>
        </div>
        <div className="divide-y divide-[#eceef1]">
          {announcements.map((announcement) => (
            <article className="p-5" key={announcement.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className="pill"
                      data-tone={teacherStatusTone(announcement.status)}
                    >
                      {announcement.status}
                    </span>
                    <span className="pill">
                      {announcement.classArm
                        ? `${announcement.classArm.classLevel.name} ${announcement.classArm.name}`
                        : "Class not available"}
                    </span>
                    {announcement.parentFacing && (
                      <span className="pill">Portal-facing</span>
                    )}
                  </div>
                  <h3 className="mt-3 text-lg font-black">
                    {announcement.title}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#68707d]">
                    {announcement.body}
                  </p>
                  <p className="mt-3 text-xs text-[#747c87]">
                    Updated {announcement.updatedAt.toLocaleString("en-NG")}
                    {announcement.scheduledFor
                      ? ` · Scheduled ${announcement.scheduledFor.toLocaleString(
                          "en-NG",
                        )}`
                      : ""}
                  </p>
                </div>

                {announcement.status === "DRAFT" && (
                  <form action={submitTeacherAnnouncement}>
                    <input
                      name="announcementId"
                      type="hidden"
                      value={announcement.id}
                    />
                    <button className="button" type="submit">
                      Submit for review
                    </button>
                  </form>
                )}
              </div>
            </article>
          ))}
          {!announcements.length && (
            <div className="empty-state">
              You have not created a class notice yet.
            </div>
          )}
        </div>
      </section>

      <section className="mt-5 rounded-xl border border-[#f0d9da] bg-[#fff7f7] p-5">
        <div className="flex gap-3">
          <BellRing className="mt-0.5 shrink-0 text-[#b91118]" size={20} />
          <div>
            <h2 className="font-black">Teacher publishing boundary</h2>
            <p className="mt-1 text-sm leading-6 text-[#68707d]">
              Teachers cannot publish announcements, create public website
              stories or send messages directly. A campus administrator reviews
              the draft before families can see it.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
