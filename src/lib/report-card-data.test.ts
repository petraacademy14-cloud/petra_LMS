import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ student: vi.fn(), roster: vi.fn(), sheets: vi.fn(), attendance: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: { student: { findFirst: m.student }, enrollment: { findMany: m.roster }, resultSheet: { findMany: m.sheets }, attendanceEntry: { findMany: m.attendance } } }));
import { loadReportCard } from "./report-card-data";
const decimal = (n: number) => ({ toString: () => String(n), toNumber: () => n });
beforeEach(() => {
  vi.clearAllMocks();
  const term = { academicSessionId: "session", academicSession: { name: "2026/2027" }, name: "First Term", startsOn: new Date("2026-09-01"), endsOn: new Date("2026-12-20") };
  m.student.mockResolvedValue({ campusId: "campus", school: { name: "Petra Academy" }, campus: { name: "Awka", city: "Awka" }, reportCardDetails: [], lastName: "Justice", firstName: "Justice", admissionNumber: "PET/001", resultEntries: [{ sheetId: "sheet", teacherComment: "good", sheet: { campusId: "campus", classArmId: "class", classArm: { classLevel: { name: "Nursery 1" }, name: "A" }, term, subject: { name: "Science" }, gradingScheme: { bands: [{ label: "C", minScore: 50, maxScore: 59, remark: "Good" }] } } }] });
  m.roster.mockResolvedValue([{ studentId: "student" }, { studentId: "other" }, { studentId: "incomplete" }]);
  m.sheets.mockResolvedValue([{ id: "sheet", components: [20, 20, 60].map((cap, i) => ({ kind: i === 2 ? "EXAM" : "CONTINUOUS_ASSESSMENT", maxScore: cap, weight: cap, scores: [{ studentId: "student", score: decimal([12, 12, 32][i]!) }, { studentId: "other", score: decimal(cap) }] })) }]);
  m.attendance.mockResolvedValue([{ status: "PRESENT" }]);
});
it("loads only authorized scope and published data, calculating real class extrema", async () => {
  const data = await loadReportCard("student", "term", "school", "campus");
  expect(m.student).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "student", schoolId: "school", campusId: "campus" } }));
  expect(m.sheets).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ schoolId: "school", campusId: "campus", termId: "term", classArmId: "class", status: { in: ["PUBLISHED", "LOCKED"] } }) }));
  expect(data?.rows[0]).toMatchObject({ cat1: 12, cat2: 12, exam: 32, total: 56, grade: "C", highest: 100, lowest: 56 });
  expect(data?.className).toBe("Nursery 1 A");
});
it("preserves real zero scores while omitting incomplete result entries", async () => {
  const sheet = { id: "sheet", components: [20, 20, 60].map((cap, i) => ({ kind: i === 2 ? "EXAM" : "CONTINUOUS_ASSESSMENT", maxScore: cap, weight: cap, scores: [{ studentId: "student", score: decimal(0) }] })) };
  m.sheets.mockResolvedValue([sheet]); expect((await loadReportCard("student", "term", "school"))?.rows[0]?.total).toBe(0);
  sheet.components[0]!.scores = []; expect(await loadReportCard("student", "term", "school")).toBeNull();
});
it("rejects mixed campus/class result data", async () => {
  m.student.mockResolvedValue({ resultEntries: [{ sheet: { campusId: "other", classArmId: "class", term: {} } }], campusId: "campus" });
  expect(await loadReportCard("student", "term", "school")).toBeNull(); expect(m.roster).not.toHaveBeenCalled();
});
