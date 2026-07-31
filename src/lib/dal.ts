import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Permission } from "@/lib/permissions";
import { hasPermission, permissionsFor } from "@/lib/permissions";
import { canAccessCampus } from "@/lib/scope";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const getViewer = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user.id) {
    redirect("/login");
  }

  const membership = await db.schoolMembership.findFirst({
    where: {
      userId: session.user.id,
      status: "ACTIVE",
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      role: true,
      schoolId: true,
      campusId: true,
      school: {
        select: {
          name: true,
          slug: true,
        },
      },
      campus: {
        select: {
          name: true,
          code: true,
        },
      },
    },
  });

  if (!membership) {
    redirect("/access-pending");
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    },
    membership,
    permissions: permissionsFor(membership.role),
  };
});

export const requirePermission = cache(async (permission: Permission) => {
  const viewer = await getViewer();

  if (!hasPermission(viewer.membership.role, permission)) {
    throw new Error(`FORBIDDEN:${permission}`);
  }

  return viewer;
});

export async function requireCampusAccess(campusId: string) {
  const viewer = await getViewer();
  const { role, campusId: assignedCampusId } = viewer.membership;

  if (
    !canAccessCampus({
      role,
      assignedCampusId,
      targetCampusId: campusId,
    })
  ) {
    throw new Error("FORBIDDEN:CAMPUS_SCOPE");
  }

  const campus = await db.campus.findFirst({
    where: {
      id: campusId,
      schoolId: viewer.membership.schoolId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!campus) {
    throw new Error("NOT_FOUND:CAMPUS");
  }

  return viewer;
}
