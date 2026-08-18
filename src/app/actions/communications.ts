"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ContentStatus } from "@/generated/prisma/enums";
import { canTransitionContent, renderCommunicationTemplate, slugifyContent, validateAudience } from "@/lib/communications";
import { requireCampusAccess, requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { supabaseStorageAdminHeaders } from "@/lib/supabase-storage";

const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const nullable = (value: FormDataEntryValue | null) => {
  const result = typeof value === "string" ? value.trim() : "";
  return result || null;
};
const dateOrNull = (value: FormDataEntryValue | null) => {
  const raw = nullable(value);
  return raw ? new Date(raw) : null;
};

async function verifyCampus(viewer: Awaited<ReturnType<typeof requirePermission>>, campusId: string | null) {
  if (!campusId) return;
  await requireCampusAccess(campusId);
  const campus = await db.campus.findFirst({ where: { id: campusId, schoolId: viewer.membership.schoolId } });
  if (!campus) throw new Error("NOT_FOUND:CAMPUS");
}

export async function createAnnouncement(formData: FormData) {
  const viewer = await requirePermission("communications.manage");
  const input = z.object({
    title: text(3, 160),
    body: text(10, 5000),
    audience: z.enum(["SCHOOL", "CAMPUS", "CLASS"]),
    campusId: z.string().nullable(),
    classArmId: z.string().nullable(),
    scheduledFor: z.date().nullable(),
    parentFacing: z.boolean(),
  }).parse({
    title: formData.get("title"), body: formData.get("body"),
    audience: formData.get("audience"), campusId: nullable(formData.get("campusId")),
    classArmId: nullable(formData.get("classArmId")), scheduledFor: dateOrNull(formData.get("scheduledFor")),
    parentFacing: formData.get("parentFacing") === "on",
  });
  if (viewer.membership.role !== "OWNER") input.campusId = viewer.membership.campusId;
  if (!validateAudience(input)) throw new Error("INVALID:ANNOUNCEMENT_AUDIENCE");
  await verifyCampus(viewer, input.campusId);
  if (input.classArmId) {
    const arm = await db.classArm.findFirst({ where: { id: input.classArmId, campusId: input.campusId ?? "__none__", campus: { schoolId: viewer.membership.schoolId } } });
    if (!arm) throw new Error("INVALID:CLASS_SCOPE");
  }
  await db.$transaction(async (tx) => {
    const item = await tx.announcement.create({ data: { ...input, schoolId: viewer.membership.schoolId, authorId: viewer.user.id } });
    await tx.auditLog.create({ data: { schoolId: viewer.membership.schoolId, campusId: input.campusId, actorUserId: viewer.user.id, action: "announcement.created", entityType: "Announcement", entityId: item.id, after: { title: item.title, audience: item.audience, status: item.status } } });
  });
  revalidatePath("/communications");
}

export async function transitionAnnouncement(id: string, next: ContentStatus) {
  const permission = next === "PUBLISHED" || next === "ARCHIVED" ? "communications.publish" : next === "APPROVED" ? "communications.review" : "communications.manage";
  const viewer = await requirePermission(permission);
  const item = await db.announcement.findFirst({ where: { id, schoolId: viewer.membership.schoolId, ...(viewer.membership.role === "OWNER" ? {} : { campusId: viewer.membership.campusId ?? "__none__" }) } });
  if (!item) throw new Error("NOT_FOUND:ANNOUNCEMENT");
  if (!canTransitionContent(item.status, next)) throw new Error("INVALID:CONTENT_TRANSITION");
  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.announcement.update({ where: { id }, data: {
      status: next,
      ...(next === "APPROVED" ? { reviewedById: viewer.user.id } : {}),
      ...(next === "PUBLISHED" ? { publishedById: viewer.user.id, publishedAt: now } : {}),
    } });
    await tx.auditLog.create({ data: { schoolId: item.schoolId, campusId: item.campusId, actorUserId: viewer.user.id, action: "announcement.status_changed", entityType: "Announcement", entityId: id, before: { status: item.status }, after: { status: next } } });
  });
  revalidatePath("/communications"); revalidatePath("/updates");
}

export async function createTemplate(formData: FormData) {
  const viewer = await requirePermission("communications.review");
  const input = z.object({
    name: text(3, 100), kind: z.enum(["GENERAL","FEE_REMINDER","RESULT_NOTICE","ATTENDANCE_NOTICE"]),
    channel: z.enum(["WHATSAPP","EMAIL","PRINT"]), subject: z.string().max(160).nullable(), body: text(5, 5000),
  }).parse({ name: formData.get("name"), kind: formData.get("kind"), channel: formData.get("channel"), subject: nullable(formData.get("subject")), body: formData.get("body") });
  await db.$transaction(async (tx) => {
    const item = await tx.communicationTemplate.create({ data: { ...input, schoolId: viewer.membership.schoolId, createdById: viewer.user.id } });
    await tx.auditLog.create({ data: { schoolId: viewer.membership.schoolId, campusId: viewer.membership.campusId, actorUserId: viewer.user.id, action: "communication_template.created", entityType: "CommunicationTemplate", entityId: item.id, after: { name: item.name, channel: item.channel, kind: item.kind } } });
  });
  revalidatePath("/communications");
}

export async function generateDeliveryDraft(announcementId: string, formData: FormData) {
  const viewer = await requirePermission("communications.manage");
  const channel = z.enum(["WHATSAPP","EMAIL","PRINT"]).parse(formData.get("channel"));
  const templateId = nullable(formData.get("templateId"));
  const announcement = await db.announcement.findFirst({ where: { id: announcementId, schoolId: viewer.membership.schoolId, ...(viewer.membership.role === "OWNER" ? {} : { campusId: viewer.membership.campusId ?? "__none__" }) } });
  if (!announcement) throw new Error("NOT_FOUND:ANNOUNCEMENT");
  const template = templateId ? await db.communicationTemplate.findFirst({ where: { id: templateId, schoolId: announcement.schoolId, channel, isActive: true } }) : null;
  const content = template ? renderCommunicationTemplate(template.body, { title: announcement.title, message: announcement.body, school: viewer.membership.school.name }) : announcement.body;
  const recipientCount = await db.guardian.count({ where: { schoolId: announcement.schoolId, students: { some: { student: { status: "ACTIVE", ...(announcement.campusId ? { campusId: announcement.campusId } : {}), ...(announcement.classArmId ? { enrollments: { some: { classArmId: announcement.classArmId, status: "CURRENT" } } } : {}) } } } } });
  await db.$transaction(async (tx) => {
    const draft = await tx.communicationDeliveryDraft.create({ data: { schoolId: announcement.schoolId, announcementId, templateId: template?.id, channel, subject: template?.subject, content, recipientCount, generatedById: viewer.user.id } });
    await tx.auditLog.create({ data: { schoolId: announcement.schoolId, campusId: announcement.campusId, actorUserId: viewer.user.id, action: "communication_delivery.generated", entityType: "CommunicationDeliveryDraft", entityId: draft.id, after: { channel, recipientCount } } });
  });
  revalidatePath("/communications");
}

export async function createPublication(formData: FormData) {
  const viewer = await requirePermission("communications.manage");
  const parsed = z.object({
    kind: z.enum(["NEWS","EVENT","ACHIEVEMENT"]), title: text(3, 180), excerpt: text(10, 320),
    body: text(20, 12000), campusId: z.string().nullable(), categoryId: z.string().nullable(),
    tags: z.string(), coverImageUrl: z.string().url().nullable(), eventStartsAt: z.date().nullable(), eventEndsAt: z.date().nullable(),
  }).parse({
    kind: formData.get("kind"), title: formData.get("title"), excerpt: formData.get("excerpt"),
    body: formData.get("body"), campusId: nullable(formData.get("campusId")), categoryId: nullable(formData.get("categoryId")),
    tags: String(formData.get("tags") ?? ""), coverImageUrl: nullable(formData.get("coverImageUrl")),
    eventStartsAt: dateOrNull(formData.get("eventStartsAt")), eventEndsAt: dateOrNull(formData.get("eventEndsAt")),
  });
  if (viewer.membership.role !== "OWNER") parsed.campusId = viewer.membership.campusId;
  await verifyCampus(viewer, parsed.campusId);
  if (parsed.kind === "EVENT" && !parsed.eventStartsAt) throw new Error("INVALID:EVENT_START");
  if (parsed.eventStartsAt && parsed.eventEndsAt && parsed.eventEndsAt < parsed.eventStartsAt) throw new Error("INVALID:EVENT_DATES");
  let slug = slugifyContent(parsed.title);
  if (await db.publication.findFirst({ where: { schoolId: viewer.membership.schoolId, slug } })) slug = `${slug}-${Date.now().toString(36)}`;
  const tags = parsed.tags.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 12);
  await db.$transaction(async (tx) => {
    const item = await tx.publication.create({ data: { ...parsed, tags, slug, schoolId: viewer.membership.schoolId, authorId: viewer.user.id } });
    await tx.auditLog.create({ data: { schoolId: viewer.membership.schoolId, campusId: parsed.campusId, actorUserId: viewer.user.id, action: "publication.created", entityType: "Publication", entityId: item.id, after: { title: item.title, kind: item.kind, status: item.status, slug } } });
  });
  revalidatePath("/communications");
}

export async function transitionPublication(id: string, next: ContentStatus) {
  const permission = next === "PUBLISHED" || next === "ARCHIVED" ? "communications.publish" : next === "APPROVED" ? "communications.review" : "communications.manage";
  const viewer = await requirePermission(permission);
  const item = await db.publication.findFirst({ where: { id, schoolId: viewer.membership.schoolId, ...(viewer.membership.role === "OWNER" ? {} : { OR: [{ campusId: viewer.membership.campusId ?? "__none__" }, { campusId: null }] }) } });
  if (!item) throw new Error("NOT_FOUND:PUBLICATION");
  if (!canTransitionContent(item.status, next)) throw new Error("INVALID:CONTENT_TRANSITION");
  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.publication.update({ where: { id }, data: { status: next, ...(next === "APPROVED" ? { reviewedById: viewer.user.id } : {}), ...(next === "PUBLISHED" ? { publishedById: viewer.user.id, publishedAt: now } : {}) } });
    await tx.auditLog.create({ data: { schoolId: item.schoolId, campusId: item.campusId, actorUserId: viewer.user.id, action: "publication.status_changed", entityType: "Publication", entityId: id, before: { status: item.status }, after: { status: next } } });
  });
  revalidatePath("/communications"); revalidatePath("/updates"); revalidatePath(`/updates/${item.slug}`);
}

export async function createCategory(formData: FormData) {
  const viewer = await requirePermission("communications.review");
  const name = text(2, 80).parse(formData.get("name"));
  await db.contentCategory.create({ data: { schoolId: viewer.membership.schoolId, name, slug: slugifyContent(name) } });
  revalidatePath("/communications");
}

export async function subscribeNewsletter(formData: FormData) {
  const input = z.object({ email: z.email().transform((v) => v.toLowerCase()), name: z.string().trim().max(100).optional() }).parse({ email: formData.get("email"), name: nullable(formData.get("name")) ?? undefined });
  const school = await db.school.findUnique({ where: { slug: "petra-academy" } });
  if (!school) throw new Error("NOT_FOUND:SCHOOL");
  await db.newsletterSubscriber.upsert({ where: { schoolId_email: { schoolId: school.id, email: input.email } }, create: { schoolId: school.id, ...input }, update: { name: input.name, isActive: true, unsubscribedAt: null, subscribedAt: new Date() } });
  revalidatePath("/updates");
}

export async function uploadCommunicationMedia(publicationId: string, formData: FormData) {
  const viewer = await requirePermission("communications.manage");
  const publication = await db.publication.findFirst({ where: { id: publicationId, schoolId: viewer.membership.schoolId, status: "DRAFT", ...(viewer.membership.role === "OWNER" ? {} : { campusId: viewer.membership.campusId ?? "__none__" }) } });
  if (!publication) throw new Error("NOT_FOUND:EDITABLE_PUBLICATION");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size < 1 || file.size > 5 * 1024 * 1024 || !["image/jpeg","image/png","image/webp","application/pdf"].includes(file.type)) throw new Error("INVALID:MEDIA_FILE");
  const supabaseUrl = process.env.SUPABASE_URL, secret = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secret) throw new Error("CONFIG:COMMUNICATION_MEDIA_STORAGE");
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "-").slice(-100);
  const storageKey = `${viewer.membership.schoolId}/${publication.id}/${crypto.randomUUID()}-${safeName}`;
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/communication-media/${storageKey}`,
    {
      method: "POST",
      headers: supabaseStorageAdminHeaders(secret, {
        "Content-Type": file.type,
        "x-upsert": "false",
      }),
      body: file,
    },
  );
  if (!response.ok) throw new Error("STORAGE:MEDIA_UPLOAD_FAILED");
  await db.communicationMedia.create({ data: { schoolId: publication.schoolId, campusId: publication.campusId, publicationId, name: String(formData.get("name") ?? safeName).slice(0, 120), storageKey, fileName: safeName, contentType: file.type, sizeBytes: file.size, uploadedById: viewer.user.id } });
  revalidatePath("/communications");
}
