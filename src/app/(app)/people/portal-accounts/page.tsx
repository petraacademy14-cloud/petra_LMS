import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, KeyRound, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { changePortalAccountStatus } from "@/app/actions/portal-accounts";
import { PageHeading } from "@/components/page-heading";
import {
  PortalPasswordResetForm,
  ProvisionPortalAccountForm,
} from "@/components/portal-account-forms";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { portalRoleLabel } from "@/lib/portal-account";

export const metadata: Metadata = { title: "Parent and student accounts" };

function dateTime(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value)
    : "Never";
}

export default async function PortalAccountsPage() {
  const viewer = await requirePermission("people.manage");
  const campusScope =
    viewer.membership.role === "OWNER"
      ? {}
      : { campusId: viewer.membership.campusId ?? "__none__" };

  const [accounts, students, guardians] = await Promise.all([
    db.portalAccount.findMany({
      where: { schoolId: viewer.membership.schoolId },
      orderBy: [{ role: "asc" }, { displayName: "asc" }],
    }),
    db.student.findMany({
      where: {
        schoolId: viewer.membership.schoolId,
        status: "ACTIVE",
        ...campusScope,
      },
      orderBy: [{ campus: { name: "asc" } }, { lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        admissionNumber: true,
        campus: { select: { name: true } },
      },
    }),
    db.guardian.findMany({
      where: {
        schoolId: viewer.membership.schoolId,
        ...(viewer.membership.role === "OWNER"
          ? {}
          : {
              students: {
                some: {
                  student: { campusId: viewer.membership.campusId ?? "__none__" },
                },
              },
            }),
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        students: {
          orderBy: { student: { firstName: "asc" } },
          select: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNumber: true,
                campusId: true,
                campus: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const allowedStudentIds = new Set(students.map((student) => student.id));
  const allowedGuardianIds = new Set(guardians.map((guardian) => guardian.id));
  const scopedAccounts = accounts.filter((account) =>
    account.role === "STUDENT"
      ? Boolean(account.studentId && allowedStudentIds.has(account.studentId))
      : Boolean(account.guardianId && allowedGuardianIds.has(account.guardianId)),
  );
  const studentAccountIds = new Set(
    accounts.map((account) => account.studentId).filter(Boolean),
  );
  const guardianAccountIds = new Set(
    accounts.map((account) => account.guardianId).filter(Boolean),
  );
  const studentsById = new Map(students.map((student) => [student.id, student]));
  const guardiansById = new Map(guardians.map((guardian) => [guardian.id, guardian]));

  const studentOptions = students
    .filter((student) => !studentAccountIds.has(student.id))
    .map((student) => ({
      value: student.id,
      label: `${student.admissionNumber} · ${student.firstName} ${student.middleName ?? ""} ${student.lastName} · ${student.campus.name}`.replace(/\s+/g, " "),
    }));
  const guardianOptions = guardians
    .filter((guardian) => !guardianAccountIds.has(guardian.id))
    .map((guardian) => ({
      value: guardian.id,
      label: `${guardian.firstName} ${guardian.lastName} · ${guardian.phone} · ${guardian.students.length} child${guardian.students.length === 1 ? "" : "ren"}`,
    }));

  return (
    <div>
      <PageHeading
        action={
          <Link className="button-secondary" href="/people">
            <ArrowLeft size={17} /> People and roles
          </Link>
        }
        description="Petra staff create these accounts and send the one-time username and temporary password to each family. Temporary passwords are never stored in readable form."
        eyebrow="School-issued access"
        title="Parent and student portal accounts"
      />

      <section className="mt-7 grid gap-5 xl:grid-cols-2">
        <article className="card p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[#fff0f1] text-[#bd1218]"><UsersRound size={21} /></span>
            <div><h2 className="text-lg font-black">Create parent account</h2><p className="text-sm text-[#6f7782]">One guardian account can see every student linked to that guardian.</p></div>
          </div>
          <div className="mt-5">
            <ProvisionPortalAccountForm options={guardianOptions} role="PARENT" />
          </div>
        </article>

        <article className="card p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[#fff0f1] text-[#bd1218]"><UserPlus size={21} /></span>
            <div><h2 className="text-lg font-black">Create student account</h2><p className="text-sm text-[#6f7782]">The student admission number becomes the suggested username.</p></div>
          </div>
          <div className="mt-5">
            <ProvisionPortalAccountForm options={studentOptions} role="STUDENT" />
          </div>
        </article>
      </section>

      <section className="card mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eaed] p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-[#d71920]" size={21} />
            <div><h2 className="font-black">Portal access register</h2><p className="text-xs text-[#747c87]">{scopedAccounts.length} account{scopedAccounts.length === 1 ? "" : "s"} in this scope</p></div>
          </div>
          <span className="pill" data-tone="brand">First login requires a new password</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Account</th><th>Linked record</th><th>Status</th><th>Usage</th><th>Actions</th></tr></thead>
            <tbody>
              {scopedAccounts.map((account) => {
                const student = account.studentId ? studentsById.get(account.studentId) : null;
                const guardian = account.guardianId ? guardiansById.get(account.guardianId) : null;
                const linkedDetail = student
                  ? `${student.admissionNumber} · ${student.campus.name}`
                  : guardian
                    ? `${guardian.phone} · ${guardian.students.map((link) => link.student.firstName).join(", ")}`
                    : "Linked record unavailable";
                const nextStatus = account.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
                return (
                  <tr key={account.id}>
                    <td><strong>{account.displayName}</strong><small className="block font-mono text-[#747c87]">{account.username}</small><span className="pill mt-2" data-tone="brand">{portalRoleLabel(account.role)}</span></td>
                    <td className="text-sm text-[#616a76]">{linkedDetail}</td>
                    <td><span className="pill" data-tone={account.status === "ACTIVE" ? "success" : undefined}>{account.status}</span>{account.mustChangePassword && <small className="mt-1 block text-[#a86b00]">Temporary password active</small>}{account.lockedUntil && account.lockedUntil > new Date() && <small className="mt-1 block text-[#a20e14]">Locked until {dateTime(account.lockedUntil)}</small>}</td>
                    <td className="text-sm text-[#616a76]"><span className="block">Last login: {dateTime(account.lastLoginAt)}</span><span className="block">Issued: {dateTime(account.credentialsIssuedAt)}</span></td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <form action={changePortalAccountStatus.bind(null, account.id, nextStatus)}>
                          <button className="button button-secondary" type="submit">{nextStatus === "ACTIVE" ? "Reactivate" : "Suspend"}</button>
                        </form>
                        <details>
                          <summary className="button button-secondary cursor-pointer list-none"><KeyRound size={16} /> Reset password</summary>
                          <div className="mt-3 min-w-[18rem] rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-lg"><PortalPasswordResetForm accountId={account.id} /></div>
                        </details>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!scopedAccounts.length && <div className="empty-state">No parent or student portal account has been created in this scope.</div>}
      </section>
    </div>
  );
}
