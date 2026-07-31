import { describe, expect, it } from "vitest";
import {
  canConvertAdmission,
  canRespondToOffer,
  guardianRelationship,
  isOfferExpired,
} from "@/lib/admission-decision";

describe("admission decision rules", () => {
  it("allows a response only while an accepted offer is pending and active", () => {
    const now = new Date("2026-07-31T12:00:00Z");
    expect(canRespondToOffer("PENDING", new Date("2026-08-07T12:00:00Z"), now)).toBe(true);
    expect(canRespondToOffer("ACCEPTED", new Date("2026-08-07T12:00:00Z"), now)).toBe(false);
    expect(canRespondToOffer("PENDING", new Date("2026-07-30T12:00:00Z"), now)).toBe(false);
  });

  it("detects expired pending offers without expiring completed responses", () => {
    const now = new Date("2026-07-31T12:00:00Z");
    expect(isOfferExpired("PENDING", new Date("2026-07-30T12:00:00Z"), now)).toBe(true);
    expect(isOfferExpired("DECLINED", new Date("2026-07-30T12:00:00Z"), now)).toBe(false);
  });

  it("converts only an accepted response that has no student record", () => {
    expect(
      canConvertAdmission({
        outcome: "ACCEPTED",
        offerResponse: "ACCEPTED",
        convertedStudentId: null,
      }),
    ).toBe(true);
    expect(
      canConvertAdmission({
        outcome: "ACCEPTED",
        offerResponse: "PENDING",
        convertedStudentId: null,
      }),
    ).toBe(false);
    expect(
      canConvertAdmission({
        outcome: "ACCEPTED",
        offerResponse: "ACCEPTED",
        convertedStudentId: "student-1",
      }),
    ).toBe(false);
  });

  it("maps common applicant relationship descriptions to student guardian values", () => {
    expect(guardianRelationship("Mother")).toBe("MOTHER");
    expect(guardianRelationship("Uncle / relative")).toBe("RELATIVE");
    expect(guardianRelationship("Legal guardian")).toBe("GUARDIAN");
    expect(guardianRelationship("Family friend")).toBe("OTHER");
  });
});
