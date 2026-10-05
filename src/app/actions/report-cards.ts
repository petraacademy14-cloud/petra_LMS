"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { reportDetailsSchema, readReportDetails } from "@/lib/report-card-details";
import { z } from "zod";

export async function saveReportDetails(_previous: { error?: string; success?: string }, form: FormData): Promise<{ error?: string; success?: string }> {
  const viewer = await requirePermission("results.approve");
  const parsed = z.object({ studentId: z.string().cuid(), termId: z.string().cuid(), version: z.string(), ...reportDetailsSchema.shape }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the report fields." };
  const { studentId, termId, version, ...details } = parsed.data;
  const scope = { schoolId: viewer.membership.schoolId, ...(viewer.membership.role === "OWNER" ? {} : { campusId: viewer.membership.campusId ?? "__none__" }) };
  const student = await db.student.findFirst({ where: { id: studentId, ...scope }, select: { campusId: true } });
  if (!student) return { error: "Report not found or unavailable to your account." };
  const term = await db.term.findFirst({ where: { id: termId, campusId: student.campusId, academicSession: { schoolId: scope.schoolId } }, select: { id: true } });
  if (!term) return { error: "Term not found." };
  try {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`report:${studentId}:${termId}`}))::text`;
      const before = await tx.reportCardDetails.findUnique({ where: { studentId_termId: { studentId, termId } } });
      if ((before?.updatedAt.toISOString() ?? "") !== version) throw new Error("STALE_REPORT");
      const saved = await tx.reportCardDetails.upsert({ where: { studentId_termId: { studentId, termId } }, create: { studentId, termId, schoolId: scope.schoolId, campusId: student.campusId, details }, update: { details, updatedAt: new Date(Math.max(Date.now(), (before?.updatedAt.getTime() ?? 0) + 1)) } });
      await tx.auditLog.create({ data: { schoolId: scope.schoolId, campusId: student.campusId, actorUserId: viewer.user.id, action: "report_card.details_saved", entityType: "ReportCardDetails", entityId: saved.id, ...(before ? { before: readReportDetails(before.details) } : {}), after: details } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "STALE_REPORT") return { error: "This report was changed in another tab. Reload before saving." };
    throw error;
  }
  revalidatePath(`/results/report-cards/${studentId}`);
  return { success: "Report details saved. Download the PDF to check the school format." };
}
