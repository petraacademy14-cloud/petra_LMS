import { NextResponse } from "next/server";
import { loadReportCard } from "@/lib/report-card-data";
import { buildReportCardPdf } from "@/lib/report-card-pdf";
import { requirePermission } from "@/lib/dal";

export async function GET(request: Request, context: { params: Promise<{ studentId: string }> }) {
  const viewer = await requirePermission("results.read");
  const schoolId = viewer.membership.schoolId;
  const campusId = viewer.membership.role === "OWNER" ? undefined : viewer.membership.campusId ?? "__none__";
  const { studentId } = await context.params;

  const termId = new URL(request.url).searchParams.get("termId");
  if (!termId) return new NextResponse("Term is required.", { status: 400 });
  const report = await loadReportCard(studentId, termId, schoolId, campusId);
  if (!report) return new NextResponse("Published report card not found.", { status: 404 });
  const bytes = await buildReportCardPdf(report);
  const filename = `${report.admissionNumber}-${report.term}-report`.replace(/[^A-Za-z0-9-]/g, "-");
  return new NextResponse(Buffer.from(bytes), { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `${new URL(request.url).searchParams.get("inline") === "true" ? "inline" : "attachment"}; filename="${filename}.pdf"`,
    "Cache-Control": "private, no-store",
  } });
}
