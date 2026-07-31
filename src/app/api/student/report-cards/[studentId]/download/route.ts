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
  if (!viewer) return new NextResponse("Unauthorized", { status: 401 });
  if (viewer.role !== "STUDENT" || !viewer.studentId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { studentId } = await context.params;
  if (viewer.studentId !== studentId) {
    return new NextResponse("Not found", { status: 404 });
  }

  const termId = new URL(request.url).searchParams.get("termId");
  if (!termId) return new NextResponse("Term is required.", { status: 400 });

  const student = await db.student.findFirst({
    where: {
      id: studentId,
      schoolId: viewer.schoolId,
    },
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
                include: {
                  scores: { where: { studentId } },
                },
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

  const reportRows = student.resultEntries.flatMap((entry) => {
    const complete = entry.sheet.components.every(
      (component) => component.scores.length > 0,
    );
    if (!complete) return [];
    const total = totalWeightedScore(
      entry.sheet.components.map((component) => ({
        score: component.scores[0]!.score,
        maxScore: component.maxScore,
        weight: component.weight,
      })),
    );
    const grade = resolveGrade(total, entry.sheet.gradingScheme.bands);
    return [{ entry, total, grade }];
  });

  if (!reportRows.length) {
    return new NextResponse("Published report card not found.", { status: 404 });
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const red = rgb(0.72, 0.07, 0.09);
  const dark = rgb(0.13, 0.15, 0.18);
  const muted = rgb(0.38, 0.42, 0.47);
  const border = rgb(0.84, 0.86, 0.89);
  const term = reportRows[0]!.entry.sheet.term;

  page.drawRectangle({ x: 0, y: 815, width: 595.28, height: 26.89, color: red });
  page.drawText(student.school.name, {
    x: 45,
    y: 775,
    size: 17,
    font: bold,
    color: red,
  });
  page.drawText("STUDENT REPORT CARD", {
    x: 45,
    y: 747,
    size: 20,
    font: bold,
    color: dark,
  });
  page.drawText(
    `${student.campus.name} | ${term.academicSession.name} | ${term.name}`,
    { x: 45, y: 726, size: 10, font: regular, color: muted },
  );
  page.drawLine({
    start: { x: 45, y: 708 },
    end: { x: 550, y: 708 },
    thickness: 1,
    color: border,
  });

  page.drawText(`Student: ${student.lastName}, ${student.firstName}`, {
    x: 45,
    y: 683,
    size: 11,
    font: bold,
    color: dark,
  });
  page.drawText(`Admission no.: ${student.admissionNumber}`, {
    x: 330,
    y: 683,
    size: 10,
    font: regular,
    color: dark,
  });

  let y = 645;
  page.drawText("Subject", { x: 45, y, size: 9, font: bold, color: dark });
  page.drawText("Total", { x: 275, y, size: 9, font: bold, color: dark });
  page.drawText("Grade", { x: 340, y, size: 9, font: bold, color: dark });
  page.drawText("Remark", { x: 405, y, size: 9, font: bold, color: dark });
  y -= 9;
  page.drawLine({
    start: { x: 45, y },
    end: { x: 550, y },
    thickness: 1,
    color: red,
  });
  y -= 20;

  const totals: number[] = [];
  for (const row of [...reportRows].sort((a, b) =>
    a.entry.sheet.subject.name.localeCompare(b.entry.sheet.subject.name),
  )) {
    if (y < 130) break;
    totals.push(row.total);
    page.drawText(row.entry.sheet.subject.name.slice(0, 34), {
      x: 45,
      y,
      size: 9,
      font: regular,
      color: dark,
    });
    page.drawText(row.total.toFixed(2), {
      x: 275,
      y,
      size: 9,
      font: regular,
      color: dark,
    });
    page.drawText(row.grade?.label ?? "-", {
      x: 340,
      y,
      size: 9,
      font: bold,
      color: red,
    });
    page.drawText((row.grade?.remark ?? "-").slice(0, 24), {
      x: 405,
      y,
      size: 9,
      font: regular,
      color: dark,
    });
    y -= 20;
  }

  y -= 8;
  page.drawLine({
    start: { x: 45, y },
    end: { x: 550, y },
    thickness: 1,
    color: border,
  });
  y -= 27;

  const average =
    totals.length > 0
      ? totals.reduce((sum, total) => sum + total, 0) / totals.length
      : 0;
  const attendance = attendanceSummary(
    student.attendanceEntries.map((item) => item.status),
  );
  page.drawText(`Published average: ${average.toFixed(2)}%`, {
    x: 45,
    y,
    size: 11,
    font: bold,
    color: dark,
  });
  page.drawText(
    `Attendance: ${attendance.attendanceRate}% (${attendance.total} released days)`,
    { x: 285, y, size: 10, font: bold, color: dark },
  );

  page.drawText(
    "This report contains only published or locked subject results and released attendance records.",
    { x: 45, y: 72, size: 8, font: regular, color: muted },
  );
  page.drawText("Generated securely from Petra LMS student portal.", {
    x: 45,
    y: 56,
    size: 8,
    font: regular,
    color: muted,
  });

  const bytes = await pdf.save();
  const termSlug = term.name.replace(/[^A-Za-z0-9]+/g, "-");
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${student.admissionNumber}-${termSlug}-report.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
