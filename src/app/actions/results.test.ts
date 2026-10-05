import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  permission: vi.fn(), campus: vi.fn(),
  db: { resultSheet: { findUnique: vi.fn() }, teachingAssignment: { findFirst: vi.fn() }, gradingScheme: { findFirst: vi.fn() }, $transaction: vi.fn() },
}));
vi.mock("@/lib/dal", () => ({ requirePermission: mocks.permission, requireCampusAccess: mocks.campus }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));

import { createResultSheet, saveResultSheetScores, transitionResultSheet } from "./results";

const ids = { sheet: "csheet123", school: "cschool123", campus: "ccampus123", term: "cterm123", class: "cclass123", subject: "csubject123", teacher: "cteacher123" };
const components = [
  { id: "cat1", kind: "CONTINUOUS_ASSESSMENT", maxScore: 20, sortOrder: 1 },
  { id: "cat2", kind: "CONTINUOUS_ASSESSMENT", maxScore: 20, sortOrder: 2 },
  { id: "exam", kind: "EXAM", maxScore: 60, sortOrder: 3 },
];
const version = "2026-10-05T12:00:00.000Z";
let scores: Map<string, number>;
let sheet: ReturnType<typeof makeSheet>;
let tx: ReturnType<typeof makeTx>;
function makeSheet() {
  return { id: ids.sheet, schoolId: ids.school, campusId: ids.campus, termId: ids.term,
    classArmId: ids.class, subjectId: ids.subject, teacherMembershipId: ids.teacher,
    status: "DRAFT", updatedAt: new Date(version), components,
    term: { academicSessionId: "session1" }, classArm: { enrollments: [{ studentId: "learner1" }] },
  };
}
function makeTx() {
  return {
    $queryRaw: vi.fn(async () => []),
    resultSheet: {
      findUniqueOrThrow: vi.fn(async () => sheet), findUnique: vi.fn(async () => sheet),
      create: vi.fn(async () => sheet),
      update: vi.fn(async ({ data }: { data: Partial<typeof sheet> }) => { sheet = { ...sheet, ...data }; return sheet; }),
    },
    teachingAssignment: { findFirst: vi.fn(async () => ({ id: "assignment" })) },
    enrollment: { findMany: vi.fn(async () => [{ studentId: "learner1" }]) },
    studentScore: {
      upsert: vi.fn(async ({ create }: { create: { componentId: string; studentId: string; score: number } }) => {
        scores.set(`${create.componentId}:${create.studentId}`, create.score);
      }),
      findMany: vi.fn(async () => [...scores].map(([key, score]) => ({ componentId: key.split(":")[0], score }))),
    },
    resultEntry: { upsert: vi.fn() }, assessmentComponent: { createMany: vi.fn() }, auditLog: { create: vi.fn() },
  };
}
function form(values: Record<string, string> = {}) {
  const input = new FormData();
  input.set("sheetId", ids.sheet); input.set("version", version);
  for (const [key, value] of Object.entries(values)) input.set(key, value);
  return input;
}
beforeEach(() => {
  vi.clearAllMocks(); sheet = makeSheet(); scores = new Map(); tx = makeTx();
  mocks.permission.mockResolvedValue({ user: { id: "user1" }, membership: { id: ids.teacher, schoolId: ids.school, campusId: ids.campus, role: "TEACHER" } });
  mocks.campus.mockResolvedValue(undefined);
  mocks.db.resultSheet.findUnique.mockImplementation(async () => sheet);
  mocks.db.teachingAssignment.findFirst.mockResolvedValue({ id: "assignment" });
  mocks.db.gradingScheme.findFirst.mockResolvedValue({ id: "scheme_" + "a".repeat(32) });
  mocks.db.$transaction.mockImplementation(async (callback) => {
    const previousScores = new Map(scores); const previousSheet = { ...sheet };
    try { return await callback(tx); }
    catch (error) { scores = previousScores; sheet = previousSheet; throw error; }
  });
});

describe("result action safeguards", () => {
  it("retains saved scores and comments when fields are omitted or blank, but saves zero", async () => {
    scores.set("cat1:learner1", 17);
    await saveResultSheetScores(form({ "score:cat1:learner1": "", "score:cat2:learner1": "0", "score:exam:outsider": "60" }));
    expect(scores.get("cat1:learner1")).toBe(17);
    expect(scores.get("cat2:learner1")).toBe(0);
    expect(scores.has("exam:outsider")).toBe(false);
    expect(tx.resultEntry.upsert).not.toHaveBeenCalled();
    expect(tx.enrollment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ campusId: ids.campus, academicSessionId: "session1", status: "CURRENT" }) }));
  });
  it("rolls back the whole save when one later field exceeds its maximum", async () => {
    scores.set("cat1:learner1", 10);
    await expect(saveResultSheetScores(form({ "score:cat1:learner1": "20", "score:exam:learner1": "61" }))).rejects.toThrow();
    expect(scores).toEqual(new Map([["cat1:learner1", 10]]));
    expect(sheet.updatedAt.toISOString()).toBe(version);
  });
  it("refuses outdated tabs before writing any scores", async () => {
    sheet.updatedAt = new Date("2026-10-05T12:01:00Z");
    await expect(saveResultSheetScores(form({ "score:cat1:learner1": "20" }))).rejects.toThrow("CONFLICT:RESULT_SHEET_CHANGED");
    expect(tx.studentScore.upsert).not.toHaveBeenCalled();
  });
  it("rechecks the draft status after taking the transaction lock", async () => {
    tx.resultSheet.findUniqueOrThrow.mockResolvedValue({ ...sheet, status: "SUBMITTED" });
    await expect(saveResultSheetScores(form())).rejects.toThrow("INVALID:RESULT_SHEET_STATE");
    expect(tx.studentScore.upsert).not.toHaveBeenCalled();
  });
  it("rejects another teacher's sheet and a revoked assignment", async () => {
    sheet.teacherMembershipId = "another-teacher";
    await expect(saveResultSheetScores(form())).rejects.toThrow("FORBIDDEN:RESULT_SHEET");
    sheet.teacherMembershipId = ids.teacher;
    tx.teachingAssignment.findFirst.mockResolvedValue(null as never);
    await expect(saveResultSheetScores(form())).rejects.toThrow("FORBIDDEN:TEACHING_ASSIGNMENT");
    expect(tx.studentScore.upsert).not.toHaveBeenCalled();
  });
  it("enforces school and campus authorization", async () => {
    sheet.schoolId = "another-school";
    await expect(saveResultSheetScores(form())).rejects.toThrow("FORBIDDEN:RESULT_SHEET");
    sheet.schoolId = ids.school;
    mocks.campus.mockRejectedValue(new Error("FORBIDDEN:CAMPUS"));
    await expect(saveResultSheetScores(form())).rejects.toThrow("FORBIDDEN:CAMPUS");
    expect(tx.studentScore.upsert).not.toHaveBeenCalled();
  });
  it("saves and submits complete scores atomically, accepting genuine zeros", async () => {
    await saveResultSheetScores(form({ intent: "submit", "score:cat1:learner1": "0", "score:cat2:learner1": "20", "score:exam:learner1": "60" }));
    expect(sheet.status).toBe("SUBMITTED"); expect(scores.size).toBe(3);
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "results.status_changed" }) }));
    await expect(saveResultSheetScores(form())).rejects.toThrow("INVALID:RESULT_SHEET_STATE");
  });
  it("refuses incomplete submission and rolls back edits in that submission", async () => {
    await expect(saveResultSheetScores(form({ intent: "submit", "score:cat1:learner1": "20" }))).rejects.toThrow("INVALID:INCOMPLETE_RESULT_SHEET");
    expect(scores.size).toBe(0); expect(sheet.status).toBe("DRAFT");
  });
  it("refuses publishing a complete-looking draft with an excessive previously saved score", async () => {
    scores = new Map([["cat1:learner1", 21], ["cat2:learner1", 20], ["exam:learner1", 60]]);
    await expect(saveResultSheetScores(form({ intent: "submit" }))).rejects.toThrow();
    expect(sheet.status).toBe("DRAFT");
  });
  it("refuses empty-class submission", async () => {
    tx.enrollment.findMany.mockResolvedValue([]);
    await expect(saveResultSheetScores(form({ intent: "submit" }))).rejects.toThrow("INVALID:INCOMPLETE_RESULT_SHEET");
  });
  it("rechecks status during an approval or submission race", async () => {
    tx.resultSheet.findUniqueOrThrow.mockResolvedValue({ ...sheet, status: "SUBMITTED" });
    await expect(transitionResultSheet(form({ nextStatus: "SUBMITTED" }))).rejects.toThrow("CONFLICT:RESULT_SHEET_CHANGED");
    expect(tx.resultSheet.update).not.toHaveBeenCalled();
  });
  it("reopens the existing subject without creating components or rewriting scores", async () => {
    const input = form({ campusId: ids.campus, termId: ids.term, classArmId: ids.class, subjectId: ids.subject,
      teacherMembershipId: ids.teacher, gradingSchemeId: "scheme_" + "a".repeat(32) });
    for (let attempt = 0; attempt < 2; attempt++) {
      await expect(createResultSheet(input)).rejects.toThrow(`REDIRECT:/results/${ids.sheet}`);
    }
    expect(tx.resultSheet.create).not.toHaveBeenCalled();
    expect(tx.assessmentComponent.createMany).not.toHaveBeenCalled();
    expect(tx.$queryRaw).toHaveBeenCalled();
  });
});
