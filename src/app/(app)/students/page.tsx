import type { Metadata } from "next";
import Link from "next/link";
import { Archive, FileUp, GraduationCap, Plus, Search, Users } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import type { StudentStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requirePermission("students.read");
  const query = await searchParams;
  const search = text(query.q);
  const campusId = text(query.campus);
  const classArmId = text(query.class);
  const status = statusValue(text(query.status));
  const schoolId = viewer.membership.schoolId;
  const campusScope =
    viewer.membership.role === "OWNER"
      ? campusId
        ? { campusId }
        : {}
      : { campusId: viewer.membership.campusId ?? "__none__" };
  const where = {
    schoolId,
    ...campusScope,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { admissionNumber: { contains: search, mode: "insensitive" as const } },
            { firstName: { contains: search, mode: "insensitive" as const } },
            { middleName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            {
              guardians: {
                some: {
                  guardian: {
                    OR: [
                      { firstName: { contains: search, mode: "insensitive" as const } },
                      { lastName: { contains: search, mode: "insensitive" as const } },
                      { phone: { contains: search } },
                    ],
                  },
                },
              },
            },
          ],
        }
      : {}),
    ...(classArmId
      ? { enrollments: { some: { classArmId, status: "CURRENT" as const } } }
      : {}),
  };
  const [students, total, active, inactive, campuses, classArms] = await Promise.all([
    db.student.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 200,
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        gender: true,
        status: true,
        campus: { select: { name: true } },
        enrollments: {
          where: { status: "CURRENT" },
          take: 1,
          select: { classArm: { select: { name: true, classLevel: { select: { name: true } } } } },
        },
        guardians: {
          where: { isPrimaryContact: true },
          take: 1,
          select: { guardian: { select: { firstName: true, lastName: true, phone: true } } },
        },
      },
    }),
    db.student.count({ where: { schoolId, ...campusScope } }),
    db.student.count({ where: { schoolId, ...campusScope, status: "ACTIVE" } }),
    db.student.count({
      where: { schoolId, ...campusScope, status: { in: ["WITHDRAWN", "GRADUATED", "ARCHIVED"] } },
    }),
    db.campus.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(viewer.membership.role === "OWNER"
          ? {}
          : { id: viewer.membership.campusId ?? "__none__" }),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.classArm.findMany({
      where: {
        isActive: true,
        campus: {
          schoolId,
          ...(viewer.membership.role === "OWNER"
            ? campusId
              ? { id: campusId }
              : {}
            : { id: viewer.membership.campusId ?? "__none__" }),
        },
      },
      orderBy: [{ classLevel: { sortOrder: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, classLevel: { select: { name: true } }, campus: { select: { name: true } } },
    }),
  ]);
  const canManage = hasPermission(viewer.membership.role, "students.manage");
  const canImport = hasPermission(viewer.membership.role, "students.import");

  return (
    <div>
      <PageHeading
        eyebrow="Student management"
        title="Student records"
        description="Search current and historical records across Petra’s campuses, classes, guardians and admission numbers."
        action={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              {canImport && <Link className="button button-secondary" href="/students/import"><FileUp size={17} /> Import</Link>}
              <Link className="button button-secondary" href="/students/promote"><GraduationCap size={17} /> Promote</Link>
              <Link className="button" href="/students/new"><Plus size={17} /> Add student</Link>
            </div>
          ) : undefined
        }
      />
      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        {[
          { label: "All records", value: total, icon: Users },
          { label: "Active students", value: active, icon: GraduationCap },
          { label: "Past / archived", value: inactive, icon: Archive },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article className="card p-5" key={item.label}>
              <Icon className="text-[#d71920]" size={21} />
              <p className="mt-4 text-3xl font-black">{item.value}</p>
              <p className="text-sm font-bold text-[#68707d]">{item.label}</p>
            </article>
          );
        })}
      </section>
      <form className="card mt-5 grid gap-3 p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <label className="field">
          <span>Search</span>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-[#8a929d]" size={17} />
            <input className="input pl-10" defaultValue={search} name="q" placeholder="Name, admission no., guardian or phone" />
          </div>
        </label>
        <Filter label="Campus" name="campus" value={campusId} options={campuses} />
        <Filter
          label="Class"
          name="class"
          value={classArmId}
          options={classArms.map((arm) => ({ id: arm.id, name: `${arm.classLevel.name} ${arm.name} · ${arm.campus.name}` }))}
        />
        <Filter
          label="Status"
          name="status"
          value={status}
          options={[
            { id: "ACTIVE", name: "Active" },
            { id: "WITHDRAWN", name: "Withdrawn" },
            { id: "GRADUATED", name: "Graduated" },
            { id: "ARCHIVED", name: "Archived" },
          ]}
        />
        <button className="button self-end" type="submit">Apply</button>
      </form>
      <section className="card mt-5 overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Student</th><th>Admission no.</th><th>Campus</th><th>Class</th><th>Primary guardian</th><th>Status</th></tr></thead>
            <tbody>
              {students.map((student) => {
                const enrollment = student.enrollments[0];
                const guardian = student.guardians[0]?.guardian;
                return (
                  <tr key={student.id}>
                    <td><Link className="font-extrabold text-[#b91118] hover:underline" href={`/students/${student.id}`}>{student.lastName}, {student.firstName} {student.middleName ?? ""}</Link></td>
                    <td className="font-bold text-[#606875]">{student.admissionNumber}</td>
                    <td>{student.campus.name}</td>
                    <td>{enrollment ? `${enrollment.classArm.classLevel.name} ${enrollment.classArm.name}` : "—"}</td>
                    <td>{guardian ? <><span className="font-bold">{guardian.firstName} {guardian.lastName}</span><span className="block text-xs text-[#7b838e]">{guardian.phone}</span></> : "—"}</td>
                    <td><span className="pill" data-tone={student.status === "ACTIVE" ? "success" : undefined}>{student.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!students.length && <div className="empty-state">No students match these filters.</div>}
      </section>
      {students.length === 200 && <p className="mt-3 text-xs text-[#7b838e]">Showing the first 200 matches. Narrow the filters to find a specific record.</p>}
    </div>
  );
}

function Filter({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value?: string;
  options: Array<{ id: string; name: string }>;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select className="input" defaultValue={value ?? ""} name={name}>
        <option value="">All</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </label>
  );
}

function text(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : undefined;
}

function statusValue(value?: string): StudentStatus | undefined {
  return ["ACTIVE", "WITHDRAWN", "GRADUATED", "ARCHIVED"].includes(value ?? "")
    ? (value as StudentStatus)
    : undefined;
}

