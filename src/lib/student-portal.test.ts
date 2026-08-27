import { describe, expect, it } from "vitest";
import {
  isReleasedAttendanceStatus,
  isReleasedResultStatus,
  studentCanSeeAnnouncement,
  uniqueStudentReportTerms,
} from "@/lib/student-portal";

describe("student portal release rules", () => {
  it("shows only submitted or locked attendance", () => {
    expect(isReleasedAttendanceStatus("DRAFT")).toBe(false);
    expect(isReleasedAttendanceStatus("SUBMITTED")).toBe(true);
    expect(isReleasedAttendanceStatus("LOCKED")).toBe(true);
  });

  it("shows only published or locked results", () => {
    expect(isReleasedResultStatus("DRAFT")).toBe(false);
    expect(isReleasedResultStatus("APPROVED")).toBe(false);
    expect(isReleasedResultStatus("PUBLISHED")).toBe(true);
    expect(isReleasedResultStatus("LOCKED")).toBe(true);
  });

  it("deduplicates report-card terms while preserving order", () => {
    expect(uniqueStudentReportTerms(["term-2", "term-1", "term-2"])).toEqual([
      "term-2",
      "term-1",
    ]);
  });

  it("enforces publication, timing and school scope for announcements", () => {
    const base = {
      status: "PUBLISHED",
      parentFacing: true,
      scheduledFor: null,
      now: new Date("2026-07-31T12:00:00Z"),
      audience: "SCHOOL" as const,
      campusId: null,
      classArmId: null,
      studentCampusId: "campus-awka",
      studentClassArmId: "class-jss1a",
    };

    expect(studentCanSeeAnnouncement(base)).toBe(true);
    expect(studentCanSeeAnnouncement({ ...base, status: "DRAFT" })).toBe(false);
    expect(studentCanSeeAnnouncement({ ...base, parentFacing: false })).toBe(false);
    expect(
      studentCanSeeAnnouncement({
        ...base,
        scheduledFor: new Date("2026-08-01T12:00:00Z"),
      }),
    ).toBe(false);
  });

  it("restricts campus and class announcements to the student's placement", () => {
    const base = {
      status: "PUBLISHED",
      parentFacing: true,
      scheduledFor: null,
      now: new Date("2026-07-31T12:00:00Z"),
      audience: "CAMPUS" as const,
      campusId: "campus-awka",
      classArmId: null,
      studentCampusId: "campus-awka",
      studentClassArmId: "class-jss1a",
    };

    expect(studentCanSeeAnnouncement(base)).toBe(true);
    expect(
      studentCanSeeAnnouncement({ ...base, campusId: "campus-nnewi" }),
    ).toBe(false);
    expect(
      studentCanSeeAnnouncement({
        ...base,
        audience: "CLASS",
        campusId: null,
        classArmId: "class-jss1a",
      }),
    ).toBe(true);
    expect(
      studentCanSeeAnnouncement({
        ...base,
        audience: "CLASS",
        campusId: null,
        classArmId: "class-jss1b",
      }),
    ).toBe(false);
  });
});
