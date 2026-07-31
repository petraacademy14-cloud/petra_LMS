import { describe, expect, it } from "vitest";
import { defaultPilotChecklist, launchBlockers } from "@/lib/launch-readiness";
describe("Phase 6 launch gate", () => {
  it("contains end-to-end operational coverage", () => {
    expect(defaultPilotChecklist.length).toBeGreaterThanOrEqual(20);
    expect(new Set(defaultPilotChecklist.map((item) => item[1]))).toContain("Finance");
    expect(new Set(defaultPilotChecklist.map((item) => item[1]))).toContain("Operations");
  });
  it("blocks launch until every checklist item passes", () => {
    expect(launchBlockers([{ label: "Backup", status: "NOT_STARTED" }], [])).toEqual(["Checklist: Backup (NOT_STARTED)"]);
  });
  it("blocks unresolved high and critical issues only", () => {
    expect(launchBlockers([], [
      { title: "Minor copy", severity: "LOW", status: "OPEN" },
      { title: "Cross-campus leak", severity: "CRITICAL", status: "OPEN" },
      { title: "Resolved outage", severity: "HIGH", status: "RESOLVED" },
    ])).toEqual(["Issue: Cross-campus leak (CRITICAL)"]);
  });
});
