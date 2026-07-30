import type { Metadata } from "next";
import Link from "next/link";
import { Archive, GraduationCap, Search, Upload, UserPlus } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { PageHeading } from "@/components/page-heading";
import {
  BulkPromotionForm,
  StudentCreateForm,
} from "@/components/student-forms";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "Students" };

function value(input: string | string[] | undefined) {
  return typeof input === "string" ? input.trim() : "";
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requirePermission("people.read");
  const query = await searchParams;
  const q = value(query.q);
  const campusId = value(query.campus);
  const status = value(query.status);
  const classArmId = value(query.class);
  const canManage = hasPermission(viewer.membership.role, "people.manage");
  const scope =
    viewer.membership.role === "OWNER"
      ? {}
      : { campusId: viewer.membership.campusId ?? "__none__" };
  const where: Prisma.StudentWhereInput = {
    schoolId: viewer.membership.schoolId,
    ...scope,
    ...(campusId ? { campusId } : {}),
    ...(status
      ? {
          status: status as "ACTIVE" | "ARCHIVED" | "WITHDRAWN" | "GRADUATED",
        }
      : {}),
    ...(classArmId
      ? { enrollments: { some: { classArmId, status: "CURRENT" } } }
      : {}),
    ...(q
      ? {
          OR: [
            { admissionNumber: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { middleName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            {
              guardians: {
                some: {
                  guardian: {
                    OR: [
                      { phone: { contains: q } },
                      { firstName: { contains: q, mode: "insensitive" } },
                      { lastName: { contains: q, mode: "insensitive" } },
                    ],
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [students, total, campuses, classArms, sessions] = await Promise.all([
    db.student.findMany({
      where,
      take: 100,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        status: true,
        campus: { select: { name: true } },
        enrollments: {
          where: { status: "CURRENT" },
          take: 1,
          select: {
            classArm: {
              select: {
                name: true,
                classLevel: { select: { name: true } },
              },
            },
          },
        },
        guardians: {
          where: { isPrimary: true },
          take: 1,
          select: { guardian: { select: { phone: true } } },
        },
      },
    }),
    db.student.count({ where }),
    db.campus.findMany({
      where: {
        schoolId: viewer.membership.schoolId,
        isActive: true,
        ...(viewer.membership.role === "OWNER"
          ? {}
          : { id: viewer.membership.campusId ?? "__none__" }),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    db.classArm.findMany({
      where: {
        isActive: true,
        campus: {
          schoolId: viewer.membership.schoolId,
          ...(viewer.membership.role === "OWNER"
            ? {}
            : { id: viewer.membership.campusId ?? "__none__" }),
        },
      },
      orderBy: [
        { classLevel: { sortOrder: "asc" } },
        { campus: { name: "asc" } },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        campus: { select: { name: true } },
        classLevel: { select: { name: true } },
      },
    }),
    db.academicSession.findMany({
      where: { schoolId: viewer.membership.schoolId },
      orderBy: { startsOn: "desc" },
      select: { id: true, name: true },
    }),
  ]);

  const campusOptions = campuses.map((campus) => ({
    value: campus.id,
    label: `${campus.name} (${campus.code})`,
  }));
  const classOptions = classArms.map((arm) => ({
    value: arm.id,
    label: `${arm.campus.name} · ${arm.classLevel.name} ${arm.name}`,
  }));
  const sessionOptions = sessions.map((session) => ({
    value: session.id,
    label: session.name,
  }));

  return (
    <div>
      <PageHeading
        action={
          canManage ? (
            <Link className="button" href="/students/import">
              <Upload size={17} /> Import records
            </Link>
          ) : undefined
        }
        description="Profiles, guardians, campus placement and complete enrolment history."
        eyebrow="Student management"
        title="Students"
      />

      <form className="card mt-7 grid gap-3 p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <label className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9299a3]"
            size={17}
          />
          <input
            className="h-11 w-full rounded-xl border border-[#dfe2e6] pl-10 pr-3"
            defaultValue={q}
            name="q"
            placeholder="Name, admission no. or guardian"
          />
        </label>
        <select
          className="h-11 rounded-xl border border-[#dfe2e6] px-3"
          defaultValue={campusId}
          name="campus"
        >
          <option value="">All campuses</option>
          {campusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="h-11 rounded-xl border border-[#dfe2e6] px-3"
          defaultValue={classArmId}
          name="class"
        >
          <option value="">All classes</option>
          {classOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="h-11 rounded-xl border border-[#dfe2e6] px-3"
          defaultValue={status}
          name="status"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
          <option value="WITHDRAWN">Withdrawn</option>
          <option value="GRADUATED">Graduated</option>
        </select>
        <button className="button" type="submit">
          Filter
        </button>
      </form>

      <section className="card mt-5 overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[#e8eaed] p-5">
          <div>
            <h2 className="font-black">Student register</h2>
            <p className="text-xs text-[#747c87]">
              Showing {students.length} of {total} matching records
            </p>
          </div>
          <div className="flex gap-2 text-xs font-bold text-[#68707d]">
            <Archive size={16} /> History preserved
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission no.</th>
                <th>Campus</th>
                <th>Current class</th>
                <th>Primary contact</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const enrollment = student.enrollments[0];
                return (
                  <tr key={student.id}>
                    <td>
                      <Link
                        className="font-extrabold text-[#b91118] hover:underline"
                        href={`/students/${student.id}`}
                      >
                        {student.lastName}, {student.firstName}{" "}
                        {student.middleName ?? ""}
                      </Link>
                    </td>
                    <td className="font-mono text-xs font-bold">
                      {student.admissionNumber}
                    </td>
                    <td>{student.campus.name}</td>
                    <td>
                      {enrollment
                        ? `${enrollment.classArm.classLevel.name} ${enrollment.classArm.name}`
                        : "Not assigned"}
                    </td>
                    <td>{student.guardians[0]?.guardian.phone ?? "—"}</td>
                    <td>
                      <span
                        className="pill"
                        data-tone={
                          student.status === "ACTIVE" ? "success" : undefined
                        }
                      >
                        {student.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!students.length && (
          <div className="empty-state">No students match these filters.</div>
        )}
      </section>

      {canManage && (
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <details className="card p-5">
            <summary className="flex cursor-pointer items-center gap-3 font-black">
              <UserPlus className="text-[#d71920]" size={20} />
              Add one student
            </summary>
            <div className="mt-5">
              <StudentCreateForm
                campuses={campusOptions}
                classArms={classOptions}
                sessions={sessionOptions}
              />
            </div>
          </details>
          <details className="card p-5">
            <summary className="flex cursor-pointer items-center gap-3 font-black">
              <GraduationCap className="text-[#d71920]" size={20} />
              Bulk class promotion
            </summary>
            <div className="mt-5">
              <BulkPromotionForm
                campuses={campusOptions}
                classArms={classOptions}
                sessions={sessionOptions}
                students={students
                  .filter((student) => student.status === "ACTIVE")
                  .map((student) => ({
                    value: student.id,
                    label: `${student.admissionNumber} · ${student.lastName}, ${student.firstName}`,
                  }))}
              />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
