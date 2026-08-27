import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";
import {
  attendanceSummary,
  resolveGrade,
  totalWeightedScore,
} from "@/lib/academics";
import { db } from "@/lib/db";
import { getPortalViewer } from "@/lib/portal-auth";

export async function GET(
  request: Request,
  context: { params: Promise<{ studentId: string }> },
) {
  const viewer = await getPortalViewer();
  if (!viewer || viewer.role !== "PARENT" || !viewer.guardianId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { studentId } = await context.params;
  const termId = new URL(request.url).searchParams.get("termId");
  if (!termId) return new NextResponse("Term is required.", { status: 400 });

  const guardianLink = await db.studentGuardian.findFirst({
    where: {
      guardianId: viewer.guardianId,
      studentId,
      student: { schoolId: viewer.schoolId },
    },
    select: { id: true },
  });
  if (!guardianLink) return new NextResponse("Not found", { status: 404 });

  const student = await db.student.findFirst({
    where: { id: studentId, schoolId: viewer.schoolId },
    include: {
      school: true,
      campus: true,
      attendanceEntries: {
        where: {
          register: {
            termId,
            status: { in: ["SUBMITTED", "LOCKED"] },
          },
        },
        select: { status: true },
      },
      resultEntries: {
        where: {
          sheet: {
            termId,
            status: { in: ["PUBLISHED", "LOCKED"] },
          },
        },
        include: {
          sheet: {
            include: {
              term: { include: { academicSession: true } },
              subject: true,
              gradingScheme: { include: { bands: true } },
              components: {
                include: { scores: { where: { studentId } } },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
    },
  });
  if (!student || !student.resultEntries.length) {
    return new NextResponse("Published report card not found.", { status: 404 });
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const red = rgb(0.72, 0.07, 0.09);
  let y = 790;

  page.drawText(student.school.name, {
    x: 45,
    y,
    size: 16,
    font: bold,
    color: red,
  });
  y -= 24;
  page.drawText("Student Report Card", { x: 45, y, size: 19, font: bold });
  y -= 24;
  const term = student.resultEntries[0]!.sheet.term;
  page.drawText(
    `${student.campus.name} | ${term.academicSession.name} | ${term.name}`,
    { x: 45, y, size: 10, font: regular },
  );
  y -= 28;
  page.drawText(`Student: ${student.lastName}, ${student.firstName}`, {
    x: 45,
    y,
    size: 11,
    font: bold,
  });
  page.drawText(`Admission no.: ${student.admissionNumber}`, {
    x: 330,
    y,
    size: 10,
    font: regular,
  });
  y -= 28;
  page.drawText("Subject", { x: 45, y, size: 10, font: bold });
  page.drawText("Total", { x: 280, y, size: 10, font: bold });
  page.drawText("Grade", { x: 345, y, size: 10, font: bold });
  page.drawText("Remark", { x: 410, y, size: 10, font: bold });
  y -= 10;
  page.drawLine({
    start: { x: 45, y },
    end: { x: 550, y },
    thickness: 1,
    color: red,
  });
  y -= 18;

  const totals: number[] = [];
  for (const entry of student.resultEntries.sort((a, b) =>
    a.sheet.subject.name.localeCompare(b.sheet.subject.name),
  )) {
    const components = entry.sheet.components;
    if (!components.every((component) => component.scores[0])) continue;
    const total = totalWeightedScore(
      components.map((component) => ({
        score: component.scores[0]!.score,
        maxScore: component.maxScore,
        weight: component.weight,
      })),
    );
    totals.push(total);
    const grade = resolveGrade(total, entry.sheet.gradingScheme.bands);
    page.drawText(entry.sheet.subject.name.slice(0, 35), {
      x: 45,
      y,
      size: 9,
      font: regular,
    });
    page.drawText(total.toFixed(2), { x: 280, y, size: 9, font: regular });
    page.drawText(grade?.label ?? "—", { x: 345, y, size: 9, font: bold });
    page.drawText((grade?.remark ?? "—").slice(0, 22), {
      x: 410,
      y,
      size: 9,
      font: regular,
    });
    y -= 19;
  }

  y -= 12;
  const average = totals.length
    ? totals.reduce((sum, total) => sum + total, 0) / totals.length
    : 0;
  const attendance = attendanceSummary(
    student.attendanceEntries.map((item) => item.status),
  );
  page.drawText(`Average: ${average.toFixed(2)}%`, {
    x: 45,
    y,
    size: 11,
    font: bold,
  });
  page.drawText(
    `Attendance: ${attendance.attendanceRate}% (${attendance.total} days)`,
    { x: 280, y, size: 11, font: bold },
  );
  y -= 45;
  page.drawText(
    "Private parent copy. This report includes only published or locked subject results.",
    {
      x: 45,
      y,
      size: 9,
      font: regular,
      color: rgb(0.35, 0.38, 0.42),
    },
  );

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${student.admissionNumber}-${term.name.replace(/[^A-Za-z0-9]+/g, "-")}-report.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
