import type { Metadata } from "next";
import { Building2, MapPin, School, Users } from "lucide-react";
import { CampusCreateForm } from "@/components/foundation-forms";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "School structure",
};

export default async function StructurePage() {
  const viewer = await requirePermission("campus.read");
  const campuses = await db.campus.findMany({
    where: {
      schoolId: viewer.membership.schoolId,
      ...(viewer.membership.role === "OWNER"
        ? {}
        : { id: viewer.membership.campusId ?? "__none__" }),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      city: true,
      state: true,
      isActive: true,
      _count: {
        select: {
          classArms: true,
          memberships: true,
          campusSubjects: true,
        },
      },
    },
  });

  return (
    <div>
      <PageHeading
        description="Campuses are independent operational scopes under one Petra Academy school record. Every future student and transaction will inherit this boundary."
        eyebrow="Organisation"
        title="School & campuses"
      />

      <section className="mt-7 grid gap-5 md:grid-cols-2">
        {campuses.map((campus) => (
          <article className="card overflow-hidden" key={campus.id}>
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
              <div className="flex gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#fff0f1] text-[#bd1218]">
                  <Building2 size={24} />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black">{campus.name}</h2>
                    <span
                      className="pill"
                      data-tone={campus.isActive ? "success" : undefined}
                    >
                      {campus.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-[#6f7782]">
                    <MapPin size={14} />
                    {campus.city}, {campus.state} State
                  </p>
                </div>
              </div>
              <span className="rounded-lg border border-[#e3e5e8] px-2.5 py-1 text-xs font-black tracking-wide text-[#656d78]">
                {campus.code}
              </span>
            </div>

            <div className="grid grid-cols-3 border-t border-[#e9ebee] bg-[#fafafa]">
              {[
                {
                  label: "Staff",
                  value: campus._count.memberships,
                  icon: Users,
                },
                {
                  label: "Class arms",
                  value: campus._count.classArms,
                  icon: School,
                },
                {
                  label: "Subjects",
                  value: campus._count.campusSubjects,
                  icon: Building2,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    className="border-r border-[#e9ebee] p-4 last:border-r-0"
                    key={item.label}
                  >
                    <Icon className="text-[#8a929d]" size={16} />
                    <p className="mt-2 text-xl font-black">{item.value}</p>
                    <p className="text-[0.68rem] font-bold text-[#7b838e]">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>

      {!campuses.length && (
        <section className="card empty-state mt-7">
          No campus is available in your current access scope.
        </section>
      )}

      <section className="card mt-5 p-5 sm:p-6">
        <h2 className="text-lg font-black">Data boundary rule</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#68707d]">
          Campus-owned records must always carry a campus ID. Owners may query
          across the school; admins and teachers are filtered to the campus in
          their active membership. This rule is enforced in the server data
          layer, not only in the interface.
        </p>
      </section>

      {viewer.membership.role === "OWNER" && (
        <section className="mt-5">
          <CampusCreateForm />
        </section>
      )}
    </div>
  );
}
