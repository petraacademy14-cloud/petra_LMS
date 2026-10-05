import { describe, expect, it } from "vitest";
import { readReportDetails, reportFormat, reportDetailsSchema } from "./report-card-details";
import { buildReportCardPdf } from "./report-card-pdf";
import { PDFDocument } from "pdf-lib";
import type { ReportCardData } from "./report-card-data";

export function reportFixture(format: "NURSERY" | "SECONDARY", subjects = 10): ReportCardData {
  return { studentId: "student", termId: "term", schoolId: "school", campusId: "campus", schoolName: "Petra Academy", campusName: "Awka Campus", city: "Awka", studentName: "Justice, Justice", admissionNumber: "PET/AWK/2026/0002", className: format === "NURSERY" ? "Nursery 1 A" : "SS 2 A", classCount: 20, session: "2026/2027", term: "First Term", age: 4, total: 56 * subjects, average: 56, attendance: { present: 40, absent: 1, late: 2, excused: 0, total: 43, attendanceRate: 97.67 }, details: readReportDetails({ teacherComment: "Good progress this term.", principalComment: "Keep working hard.", teacherName: "Preview Teacher", principalName: "Preview Principal", nextTermBegins: "2027-01-11" }), format, version: "", rows: Array.from({ length: subjects }, (_, i) => ({ subject: ["Lexis and Structure", "Reading and Writing", "Language", "Mathematics", "Science & Health Education", "Our World", "Religion and National Value", "Cultural and Creative Arts", "Creativity", "Grooming"][i % 10]!, cat1: 12, cat2: 12, exam: 32, total: 56, grade: "C", remark: "Good", highest: 90, lowest: 40 })) };
}
describe("school report formats", () => {
  it("chooses nursery and allows an explicit override", () => {
    expect(reportFormat("Nursery 1 A", readReportDetails({}))).toBe("NURSERY");
    expect(reportFormat("SS2 A", readReportDetails({}))).toBe("SECONDARY");
    expect(reportFormat("Nursery 1 A", readReportDetails({ format: "SECONDARY" }))).toBe("SECONDARY");
  });
  it("limits comments and rejects malformed dates", () => {
    expect(reportDetailsSchema.safeParse({ teacherComment: "x".repeat(1001) }).success).toBe(false);
    expect(reportDetailsSchema.safeParse({ nextTermBegins: "tomorrow" }).success).toBe(false);
  });
  it("generates both templates and paginates long data", async () => {
    for (const format of ["NURSERY", "SECONDARY"] as const) {
      const fixture = reportFixture(format);
      const pdf = await PDFDocument.load(await buildReportCardPdf(fixture));
      expect(pdf.getPageCount()).toBeGreaterThan(0);
      const large = reportFixture(format, 65);
      large.details.teacherComment = "A long comment with details. ".repeat(30);
      large.rows[0]!.remark = "Progress with verylongwords".repeat(20);
      const pages = await PDFDocument.load(await buildReportCardPdf(large));
      expect(pages.getPageCount()).toBeGreaterThan(2);
    }
  });
});
