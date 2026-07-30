import type { Metadata } from "next";
import { BookOpenCheck, CalendarDays, Layers3, Shapes } from "lucide-react";
import { AcademicSetupForms } from "@/components/foundation-forms";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Academics",
};

export default async function AcademicsPage() {
  const viewer = await requirePermission("academic.read");
  const schoolId = viewer.membership.schoolId;
  const campusId =
    viewer.membership.role === "OWNER"
      ? undefined
      : (viewer.membership.campusId ?? "__none__");

  const [sessions, classLevels, subjects, campuses] = await Promise.all([
    db.academicSession.findMany({
      where: { schoolId },
      orderBy: { startsOn: "desc" },
      select: {
        id: true,
        name: true,
        startsOn: true,
        endsOn: true,
        isCurrent: true,
        terms: {
          where: campusId ? { campusId } : {},
          orderBy: [{ campus: { name: "asc" } }, { startsOn: "asc" }],
          select: {
            id: true,
            name: true,
            kind: true,
            isCurrent: true,
            startsOn: true,
            endsOn: true,
            campus: { select: { name: true } },
          },
        },
      },
    }),
    db.classLevel.findMany({
      where: { schoolId, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        arms: {
          where: {
            isActive: true,
            ...(campusId ? { campusId } : {}),
          },
          select: {
            id: true,
            name: true,
            code: true,
            campus: { select: { name: true } },
          },
        },
      },
    }),
    db.subject.findMany({
      where: { schoolId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        campusSubjects: {
          where: {
            isActive: true,
            ...(campusId ? { campusId } : {}),
          },
          select: {
            campus: { select: { name: true } },
          },
        },
      },
    }),
    db.campus.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(campusId ? { id: campusId } : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const currentSession = sessions.find((session) => session.isCurrent);

  return (
    <div>
      <PageHeading
        description="Sessions belong to the school; terms, class arms and subject offerings are campus-aware so Awka and Nnewi can run correctly."
        eyebrow="Academic setup"
        title="Sessions, classes & subjects"
      />

      <section className="mt-7 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[#e8eaed] p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-[#fff0f1] text-[#bd1218]">
              <CalendarDays size={20} />
            </span>
            <div>
              <h2 className="font-black">Academic calendar</h2>
              <p className="text-xs text-[#747c87]">
                {sessions.length} session{sessions.length === 1 ? "" : "s"}{" "}
                configured
              </p>
            </div>
          </div>
          {currentSession ? (
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-black">{currentSession.name}</h3>
                <span className="pill" data-tone="success">
                  Current session
                </span>
              </div>
              <p className="mt-1 text-sm text-[#747c87]">
                {currentSession.startsOn.toLocaleDateString("en-NG")} —{" "}
                {currentSession.endsOn.toLocaleDateString("en-NG")}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {currentSession.terms.map((term) => (
                  <div
                    className="rounded-xl border border-[#e5e7eb] p-4"
                    key={term.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="pill">{term.campus.name}</span>
                      {term.isCurrent && (
                        <span className="pill" data-tone="brand">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-3 font-extrabold">{term.name}</p>
                    <p className="mt-1 text-xs text-[#7a828d]">
                      {term.startsOn.toLocaleDateString("en-NG")} —{" "}
                      {term.endsOn.toLocaleDateString("en-NG")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              No current academic session has been selected.
            </div>
          )}
        </article>

        <article className="card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[#e8eaed] p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-[#eef4ff] text-[#2f65b0]">
              <Layers3 size={20} />
            </span>
            <div>
              <h2 className="font-black">Class structure</h2>
              <p className="text-xs text-[#747c87]">
                {classLevels.length} active levels
              </p>
            </div>
          </div>
          <div className="divide-y divide-[#e8eaed]">
            {classLevels.map((level) => (
              <div className="p-4 sm:px-5" key={level.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-extrabold">{level.name}</span>
                  <span className="text-xs font-black text-[#8a929d]">
                    {level.code}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {level.arms.map((arm) => (
                    <span className="pill" key={arm.id}>
                      {arm.campus.name}: {arm.name}
                    </span>
                  ))}
                  {!level.arms.length && (
                    <span className="text-xs text-[#9299a3]">
                      No arms in this scope
                    </span>
                  )}
                </div>
              </div>
            ))}
            {!classLevels.length && (
              <div className="empty-state">No class levels configured.</div>
            )}
          </div>
        </article>
      </section>

      <section className="card mt-5 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[#e8eaed] p-5">
          <span className="grid size-10 place-items-center rounded-xl bg-[#eaf8f0] text-[#14804a]">
            <BookOpenCheck size={20} />
          </span>
          <div>
            <h2 className="font-black">Subject catalogue</h2>
            <p className="text-xs text-[#747c87]">
              School-wide subjects with campus offerings
            </p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Code</th>
                <th>Available at</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.id}>
                  <td>
                    <span className="flex items-center gap-2 font-extrabold">
                      <Shapes size={16} className="text-[#d71920]" />
                      {subject.name}
                    </span>
                  </td>
                  <td className="font-bold text-[#68707d]">{subject.code}</td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      {subject.campusSubjects.map((offering) => (
                        <span
                          className="pill"
                          key={offering.campus.name}
                          data-tone="success"
                        >
                          {offering.campus.name}
                        </span>
                      ))}
                      {!subject.campusSubjects.length && (
                        <span className="text-xs text-[#9299a3]">
                          Not enabled
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!subjects.length && (
          <div className="empty-state">No subjects configured.</div>
        )}
      </section>

      <AcademicSetupForms
        campuses={campuses}
        canManageAcademics={hasPermission(
          viewer.membership.role,
          "academic.manage",
        )}
        canManageSchool={hasPermission(
          viewer.membership.role,
          "school.manage",
        )}
        classLevels={classLevels.map(({ id, name }) => ({ id, name }))}
        sessions={sessions.map(({ id, name }) => ({ id, name }))}
        subjects={subjects.map(({ id, name }) => ({ id, name }))}
      />
    </div>
  );
}
