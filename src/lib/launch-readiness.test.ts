import { describe, expect, it } from "vitest";
import {
  defaultPilotChecklist,
  launchBlockers,
} from "@/lib/launch-readiness";

describe("Phase 6 launch gate", () => {
  it("contains website, admissions, portal and operational coverage", () => {
    expect(defaultPilotChecklist.length).toBeGreaterThanOrEqual(30);
    const areas = new Set(defaultPilotChecklist.map((item) => item[1]));
    expect(areas).toContain("Website");
    expect(areas).toContain("Admissions");
    expect(areas).toContain("Portals");
    expect(areas).toContain("Finance");
    expect(areas).toContain("Operations");
  });

  it("blocks launch until every checklist item passes", () => {
    expect(
      launchBlockers([{ label: "Website corrections", status: "NOT_STARTED" }], []),
    ).toEqual(["Checklist: Website corrections (NOT_STARTED)"]);
  });

  it("blocks unresolved high and critical issues only", () => {
    expect(
      launchBlockers([], [
        { title: "Minor copy", severity: "LOW", status: "OPEN" },
        {
          title: "Cross-campus leak",
          severity: "CRITICAL",
          status: "OPEN",
        },
        { title: "Resolved outage", severity: "HIGH", status: "RESOLVED" },
      ]),
    ).toEqual(["Issue: Cross-campus leak (CRITICAL)"]);
  });
});
