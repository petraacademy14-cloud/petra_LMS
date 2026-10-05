import { NextResponse } from "next/server";
import { loadReportCard } from "@/lib/report-card-data";
import { buildReportCardPdf } from "@/lib/report-card-pdf";
import { getPortalViewer } from "@/lib/portal-auth";
import { db } from "@/lib/db";

export async function GET(request: Request, context: { params: Promise<{ studentId: string }> }) {
  const viewer = await getPortalViewer();
  if (!viewer || viewer.role !== "PARENT") return new NextResponse("Unauthorized", { status: 401 });
  const schoolId = viewer.schoolId;
  const campusId = undefined;
  const { studentId } = await context.params;
  if (!viewer.guardianId) return new NextResponse("Unauthorized", { status: 401 });
  const link = await db.studentGuardian.findFirst({ where: { studentId, guardianId: viewer.guardianId, student: { schoolId } }, select: { id: true } });
  if (!link) return new NextResponse("Not found", { status: 404 });
  const termId = new URL(request.url).searchParams.get("termId");
  if (!termId) return new NextResponse("Term is required.", { status: 400 });
  const report = await loadReportCard(studentId, termId, schoolId, campusId);
  if (!report) return new NextResponse("Published report card not found.", { status: 404 });
  const bytes = await buildReportCardPdf(report);
  const filename = `${report.admissionNumber}-${report.term}-report`.replace(/[^A-Za-z0-9-]/g, "-");
  return new NextResponse(Buffer.from(bytes), { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}.pdf"`,
    "Cache-Control": "private, no-store",
  } });
}
