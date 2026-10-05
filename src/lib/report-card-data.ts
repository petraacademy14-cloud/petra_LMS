import "server-only";
import { db } from "@/lib/db";
import { attendanceSummary, resolveGrade, totalWeightedScore } from "@/lib/academics";
import { readReportDetails, reportFormat } from "@/lib/report-card-details";

// Call only after the route has authorized this student and school/campus scope.
export async function loadReportCard(studentId: string, termId: string, schoolId: string, campusId?: string) {
  const student = await db.student.findFirst({
    where: { id: studentId, schoolId, ...(campusId ? { campusId } : {}) },
    include: { school: true, campus: true, reportCardDetails: { where: { termId } },
      resultEntries: { where: { sheet: { termId, schoolId, status: { in: ["PUBLISHED", "LOCKED"] } } },
        include: { sheet: { include: { classArm: { include: { classLevel: true } }, term: { include: { academicSession: true } }, subject: true, gradingScheme: { include: { bands: true } } } } } },
    },
  });
  if (!student || !student.resultEntries.length) return null;
  const first = student.resultEntries[0]!.sheet;
  const term = first.term;
  // Historical report class comes from this term's sheets, never today's enrollment.
  if (student.resultEntries.some((e) => e.sheet.campusId !== student.campusId || e.sheet.classArmId !== first.classArmId)) return null;
  const roster = await db.enrollment.findMany({ where: { student: { schoolId }, campusId: student.campusId, classArmId: first.classArmId, academicSessionId: term.academicSessionId, startsOn: { lte: term.endsOn }, OR: [{ endsOn: null }, { endsOn: { gte: term.startsOn } }] }, select: { studentId: true } });
  const classIds = [...new Set([...roster.map((e) => e.studentId), studentId])];
  const [sheets, attendanceEntries] = await Promise.all([
    db.resultSheet.findMany({ where: { id: { in: student.resultEntries.map((e) => e.sheetId) }, schoolId, campusId: student.campusId, termId, classArmId: first.classArmId, status: { in: ["PUBLISHED", "LOCKED"] } }, include: { components: { orderBy: { sortOrder: "asc" }, include: { scores: { where: { studentId: { in: classIds } } } } } } }),
    db.attendanceEntry.findMany({ where: { studentId, register: { termId, campusId: student.campusId, classArmId: first.classArmId, status: { in: ["SUBMITTED", "LOCKED"] } } }, select: { status: true } }),
  ]);
  const rows = student.resultEntries.flatMap((entry) => {
    const sheet = sheets.find((s) => s.id === entry.sheetId);
    if (!sheet?.components.length) return [];
    function scoresFor(id: string) { return sheet!.components.map((c) => c.scores.find((s) => s.studentId === id)); }
    function totalFor(id: string): number | null {
      const scores = scoresFor(id);
      if (scores.some((s) => !s)) return null;
      return totalWeightedScore(sheet!.components.map((c, i) => ({ score: scores[i]!.score, maxScore: c.maxScore, weight: c.weight })));
    }
    const total = totalFor(studentId);
    if (total === null) return [];
    const totals = classIds.map(totalFor).filter((n): n is number => n !== null);
    const cat = sheet.components.filter((c) => c.kind === "CONTINUOUS_ASSESSMENT");
    const exam = sheet.components.find((c) => c.kind === "EXAM");
    const score = (c: typeof exam) => c?.scores.find((s) => s.studentId === studentId)?.score.toNumber() ?? null;
    const grade = resolveGrade(total, entry.sheet.gradingScheme.bands);
    return [{ subject: entry.sheet.subject.name, cat1: score(cat[0]), cat2: score(cat[1]), exam: score(exam), total, grade: grade?.label ?? "", remark: entry.teacherComment || grade?.remark || "", highest: Math.max(...totals), lowest: Math.min(...totals) }];
  }).sort((a, b) => a.subject.localeCompare(b.subject));
  if (!rows.length) return null;
  const details = readReportDetails(student.reportCardDetails[0]?.details);
  const className = `${first.classArm.classLevel.name} ${first.classArm.name}`;
  const total = rows.reduce((sum, r) => sum + r.total, 0);
  const age = student.dateOfBirth ? term.startsOn.getUTCFullYear() - student.dateOfBirth.getUTCFullYear() - (term.startsOn.getUTCMonth() < student.dateOfBirth.getUTCMonth() || term.startsOn.getUTCMonth() === student.dateOfBirth.getUTCMonth() && term.startsOn.getUTCDate() < student.dateOfBirth.getUTCDate() ? 1 : 0) : null;
  return { studentId, termId, schoolId, campusId: student.campusId, schoolName: student.school.name, campusName: student.campus.name, city: student.campus.city, studentName: `${student.lastName}, ${student.firstName}${student.middleName ? ` ${student.middleName}` : ""}`, admissionNumber: student.admissionNumber, className, classCount: classIds.length, session: term.academicSession.name, term: term.name, age, rows, total, average: total / rows.length, attendance: attendanceSummary(attendanceEntries.map((e) => e.status)), details, format: reportFormat(className, details), version: student.reportCardDetails[0]?.updatedAt.toISOString() ?? "" };
}
export type ReportCardData = NonNullable<Awaited<ReturnType<typeof loadReportCard>>>;
