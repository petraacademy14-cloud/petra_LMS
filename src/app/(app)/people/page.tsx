import type { Metadata } from "next";
import { Shield, UserRoundCheck } from "lucide-react";
import type { Role } from "@/generated/prisma/enums";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { permissionsFor } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "People & roles",
};

const roleDescriptions: Record<Role, string> = {
  OWNER: "School-wide control across Awka and Nnewi",
  ADMIN: "Operational control within one assigned campus",
  TEACHER: "Academic read access within one assigned campus",
};

export default async function PeoplePage() {
  const viewer = await requirePermission("people.read");
  const memberships = await db.schoolMembership.findMany({
    where: {
      schoolId: viewer.membership.schoolId,
      ...(viewer.membership.role === "OWNER"
        ? {}
        : { campusId: viewer.membership.campusId }),
    },
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
    select: {
      id: true,
      role: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          email: true,
          emailVerified: true,
        },
      },
      campus: {
        select: {
          name: true,
        },
      },
    },
  });

  return (
    <div>
      <PageHeading
        description="Every person receives a school membership, a role and—except school-wide owners—a campus scope. Accounts are issued by authorized staff; public sign-up is disabled."
        eyebrow="Identity & access"
        title="People, roles & permissions"
      />

      <section className="mt-7 grid gap-4 lg:grid-cols-3">
        {(["OWNER", "ADMIN", "TEACHER"] as Role[]).map((role) => (
          <article className="card p-5" key={role}>
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-11 place-items-center rounded-xl bg-[#fff0f1] text-[#bd1218]">
                <Shield size={21} />
              </span>
              <span className="pill" data-tone="brand">
                {permissionsFor(role).length} permissions
              </span>
            </div>
            <h2 className="mt-5 text-lg font-black">{role}</h2>
            <p className="mt-1 text-sm leading-6 text-[#68707d]">
              {roleDescriptions[role]}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {permissionsFor(role).slice(0, 4).map((permission) => (
                <span className="pill" key={permission}>
                  {permission.replace(".", " · ")}
                </span>
              ))}
              {permissionsFor(role).length > 4 && (
                <span className="pill">
                  +{permissionsFor(role).length - 4} more
                </span>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="card mt-5 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[#e8eaed] p-5">
          <UserRoundCheck className="text-[#d71920]" size={21} />
          <div>
            <h2 className="font-black">Staff access register</h2>
            <p className="text-xs text-[#747c87]">
              {memberships.length} account
              {memberships.length === 1 ? "" : "s"} in this scope
            </p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Campus scope</th>
                <th>Status</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((membership) => (
                <tr key={membership.id}>
                  <td>
                    <span className="font-extrabold">
                      {membership.user.name}
                    </span>
                  </td>
                  <td>
                    <span className="pill" data-tone="brand">
                      {membership.role}
                    </span>
                  </td>
                  <td className="font-bold text-[#616a76]">
                    {membership.campus?.name ?? "All campuses"}
                  </td>
                  <td>
                    <span
                      className="pill"
                      data-tone={
                        membership.status === "ACTIVE" ? "success" : undefined
                      }
                    >
                      {membership.status}
                    </span>
                  </td>
                  <td className="text-sm text-[#68707d]">
                    {membership.user.email}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!memberships.length && (
          <div className="empty-state">
            No staff memberships are available in this scope.
          </div>
        )}
      </section>
    </div>
  );
}
