import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ permission: vi.fn(), student: vi.fn(), term: vi.fn(), before: vi.fn(), upsert: vi.fn(), audit: vi.fn(), transaction: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requirePermission: mocks.permission }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/db", () => ({ db: { student: { findFirst: mocks.student }, term: { findFirst: mocks.term }, $transaction: mocks.transaction } }));
import { saveReportDetails } from "./report-cards";
const studentId = "cstudent0000001", termId = "cterm000000001";
function form() { const data = new FormData(); data.set("studentId", studentId); data.set("termId", termId); data.set("version", ""); data.set("teacherComment", "Great progress"); return data; }
beforeEach(() => {
  vi.clearAllMocks(); mocks.permission.mockResolvedValue({ user: { id: "user" }, membership: { role: "ADMIN", schoolId: "school", campusId: "campus" } });
  mocks.student.mockResolvedValue({ campusId: "campus" }); mocks.term.mockResolvedValue({ id: termId }); mocks.before.mockResolvedValue(null); mocks.upsert.mockResolvedValue({ id: "report" }); mocks.audit.mockResolvedValue({});
  mocks.transaction.mockImplementation(async (fn) => fn({ $queryRaw: vi.fn(), reportCardDetails: { findUnique: mocks.before, upsert: mocks.upsert }, auditLog: { create: mocks.audit } }));
});
describe("report details authorization and concurrency", () => {
  it("requires approval permission and scopes the student to admin campus", async () => {
    expect(await saveReportDetails({}, form())).toHaveProperty("success");
    expect(mocks.permission).toHaveBeenCalledWith("results.approve");
    expect(mocks.student).toHaveBeenCalledWith(expect.objectContaining({ where: { id: studentId, schoolId: "school", campusId: "campus" } }));
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ schoolId: "school", campusId: "campus", actorUserId: "user", action: "report_card.details_saved" }) }));
  });
  it("never writes for a student outside the authorized scope", async () => {
    mocks.student.mockResolvedValue(null); expect(await saveReportDetails({}, form())).toHaveProperty("error"); expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("rejects a term from another campus", async () => {
    mocks.term.mockResolvedValue(null); expect(await saveReportDetails({}, form())).toHaveProperty("error"); expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("rejects stale tabs without overwriting details", async () => {
    mocks.before.mockResolvedValue({ updatedAt: new Date("2026-10-01"), details: {} });
    expect(await saveReportDetails({}, form())).toEqual({ error: "This report was changed in another tab. Reload before saving." }); expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("rejects overlong comments before writes", async () => {
    const data = form(); data.set("teacherComment", "x".repeat(1001)); expect(await saveReportDetails({}, data)).toHaveProperty("error"); expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
