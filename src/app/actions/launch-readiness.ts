"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCampusAccess, requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import {
  defaultPilotChecklist,
  launchBlockers,
} from "@/lib/launch-readiness";

const short = z.string().trim().min(3).max(180);
const long = z.string().trim().min(3).max(5000);

export async function createPilotRun(formData: FormData) {
  const viewer = await requirePermission("launch.approve");
  const input = z
    .object({
      name: short,
      notes: z.string().trim().max(3000).optional(),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
    })
    .parse({
      name: formData.get("name"),
      notes: String(formData.get("notes") ?? "") || undefined,
      startsAt: String(formData.get("startsAt") ?? "") || undefined,
      endsAt: String(formData.get("endsAt") ?? "") || undefined,
    });

  const startsAt = input.startsAt ? new Date(input.startsAt) : null;
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  if (startsAt && endsAt && endsAt < startsAt) {
    throw new Error("INVALID:PILOT_DATES");
  }

  const runId = randomUUID();
  const now = new Date();

  await db.$transaction(async (tx) => {
    const run = await tx.pilotRun.create({
      data: {
        id: runId,
        schoolId: viewer.membership.schoolId,
        name: input.name,
        notes: input.notes,
        startsAt,
        endsAt,
        createdById: viewer.user.id,
        createdAt: now,
        updatedAt: now,
      },
    });

    await tx.pilotChecklistItem.createMany({
      data: defaultPilotChecklist.map(([key, area, label]) => ({
        id: randomUUID(),
        pilotRunId: runId,
        key,
        area,
        label,
        createdAt: now,
        updatedAt: now,
      })),
    });

    await tx.launchApproval.create({
      data: {
        id: randomUUID(),
        pilotRunId: runId,
        createdAt: now,
        updatedAt: now,
      },
    });

    await tx.auditLog.create({
      data: {
        schoolId: viewer.membership.schoolId,
        actorUserId: viewer.user.id,
        action: "pilot.created",
        entityType: "PilotRun",
        entityId: run.id,
        after: { name: run.name, status: run.status },
      },
    });
  });

  revalidatePath("/launch-readiness");
}

export async function setPilotStatus(id: string, formData: FormData) {
  const viewer = await requirePermission("launch.approve");
  const status = z
    .enum(["PLANNED", "ACTIVE", "BLOCKED", "COMPLETED"])
    .parse(formData.get("status"));
  const run = await db.pilotRun.findFirst({
    where: { id, schoolId: viewer.membership.schoolId },
  });
  if (!run) throw new Error("NOT_FOUND:PILOT");

  await db.$transaction(async (tx) => {
    await tx.pilotRun.update({ where: { id }, data: { status } });
    await tx.auditLog.create({
      data: {
        schoolId: run.schoolId,
        actorUserId: viewer.user.id,
        action: "pilot.status_changed",
        entityType: "PilotRun",
        entityId: id,
        before: { status: run.status },
        after: { status },
      },
    });
  });

  revalidatePath("/launch-readiness");
}

export async function updateChecklistItem(id: string, formData: FormData) {
  const viewer = await requirePermission("launch.manage");
  const status = z
    .enum(["NOT_STARTED", "IN_PROGRESS", "PASSED", "FAILED", "BLOCKED"])
    .parse(formData.get("status"));
  const evidence = z
    .string()
    .trim()
    .max(3000)
    .parse(String(formData.get("evidence") ?? ""));
  const item = await db.pilotChecklistItem.findFirst({
    where: { id },
  });
  if (!item) throw new Error("NOT_FOUND:CHECKLIST_ITEM");

  const run = await db.pilotRun.findFirst({
    where: { id: item.pilotRunId, schoolId: viewer.membership.schoolId },
  });
  if (!run) throw new Error("NOT_FOUND:CHECKLIST_ITEM");

  await db.$transaction(async (tx) => {
    await tx.pilotChecklistItem.update({
      where: { id },
      data: {
        status,
        evidence: evidence || null,
        verifiedById: viewer.user.id,
        verifiedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        schoolId: viewer.membership.schoolId,
        campusId: viewer.membership.campusId,
        actorUserId: viewer.user.id,
        action: "pilot.checklist_updated",
        entityType: "PilotChecklistItem",
        entityId: id,
        before: { status: item.status },
        after: { status, evidence: Boolean(evidence) },
      },
    });
  });

  revalidatePath("/launch-readiness");
}

export async function reportPilotIssue(
  pilotRunId: string,
  formData: FormData,
) {
  const viewer = await requirePermission("launch.manage");
  let campusId = String(formData.get("campusId") ?? "").trim() || null;
  if (viewer.membership.role !== "OWNER") {
    campusId = viewer.membership.campusId;
  }
  if (campusId) await requireCampusAccess(campusId);

  const input = z
    .object({
      title: short,
      description: long,
      route: z.string().trim().max(300).optional(),
      severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    })
    .parse({
      title: formData.get("title"),
      description: formData.get("description"),
      route: String(formData.get("route") ?? "") || undefined,
      severity: formData.get("severity"),
    });

  const run = await db.pilotRun.findFirst({
    where: { id: pilotRunId, schoolId: viewer.membership.schoolId },
  });
  if (!run) throw new Error("NOT_FOUND:PILOT");

  await db.$transaction(async (tx) => {
    const issue = await tx.pilotIssue.create({
      data: {
        id: randomUUID(),
        schoolId: run.schoolId,
        campusId,
        pilotRunId,
        ...input,
        reportedById: viewer.user.id,
      },
    });
    await tx.auditLog.create({
      data: {
        schoolId: run.schoolId,
        campusId,
        actorUserId: viewer.user.id,
        action: "pilot.issue_reported",
        entityType: "PilotIssue",
        entityId: issue.id,
        after: { title: issue.title, severity: issue.severity },
      },
    });
  });

  revalidatePath("/launch-readiness");
}

export async function updatePilotIssue(id: string, formData: FormData) {
  const viewer = await requirePermission("launch.manage");
  const status = z
    .enum(["OPEN", "IN_PROGRESS", "RESOLVED", "ACCEPTED_RISK"])
    .parse(formData.get("status"));
  const resolution = z
    .string()
    .trim()
    .max(3000)
    .parse(String(formData.get("resolution") ?? ""));
  const issue = await db.pilotIssue.findFirst({
    where: {
      id,
      schoolId: viewer.membership.schoolId,
      ...(viewer.membership.role === "OWNER"
        ? {}
        : { campusId: viewer.membership.campusId ?? "__none__" }),
    },
  });
  if (!issue) throw new Error("NOT_FOUND:PILOT_ISSUE");
  if (["RESOLVED", "ACCEPTED_RISK"].includes(status) && !resolution) {
    throw new Error("INVALID:ISSUE_RESOLUTION");
  }

  await db.$transaction(async (tx) => {
    await tx.pilotIssue.update({
      where: { id },
      data: {
        status,
        resolution: resolution || null,
        ...(["RESOLVED", "ACCEPTED_RISK"].includes(status)
          ? { resolvedById: viewer.user.id, resolvedAt: new Date() }
          : { resolvedById: null, resolvedAt: null }),
      },
    });
    await tx.auditLog.create({
      data: {
        schoolId: issue.schoolId,
        campusId: issue.campusId,
        actorUserId: viewer.user.id,
        action: "pilot.issue_status_changed",
        entityType: "PilotIssue",
        entityId: id,
        before: { status: issue.status },
        after: { status, resolution: Boolean(resolution) },
      },
    });
  });

  revalidatePath("/launch-readiness");
}

export async function approveLaunch(pilotRunId: string, formData: FormData) {
  const viewer = await requirePermission("launch.approve");
  const summary = z
    .string()
    .trim()
    .min(10)
    .max(3000)
    .parse(formData.get("summary"));
  const run = await db.pilotRun.findFirst({
    where: { id: pilotRunId, schoolId: viewer.membership.schoolId },
  });
  if (!run) throw new Error("NOT_FOUND:PILOT");

  const [checklist, issues, approval] = await Promise.all([
    db.pilotChecklistItem.findMany({ where: { pilotRunId } }),
    db.pilotIssue.findMany({ where: { pilotRunId } }),
    db.launchApproval.findUnique({ where: { pilotRunId } }),
  ]);
  if (!approval) throw new Error("NOT_FOUND:PILOT");

  const blockers = launchBlockers(checklist, issues);
  if (blockers.length) {
    throw new Error(`BLOCKED:LAUNCH:${blockers.join("|")}`);
  }

  await db.$transaction(async (tx) => {
    await tx.launchApproval.update({
      where: { pilotRunId },
      data: {
        status: "APPROVED",
        summary,
        approvedById: viewer.user.id,
        approvedAt: new Date(),
      },
    });
    await tx.pilotRun.update({
      where: { id: pilotRunId },
      data: { status: "COMPLETED" },
    });
    await tx.auditLog.create({
      data: {
        schoolId: run.schoolId,
        actorUserId: viewer.user.id,
        action: "launch.approved",
        entityType: "LaunchApproval",
        entityId: approval.id,
        after: { pilotRunId, summary },
      },
    });
  });

  revalidatePath("/launch-readiness");
}
