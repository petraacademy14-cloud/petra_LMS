import { describe, expect, it } from "vitest";
import {
  applicationNextStatuses,
  applicationStatusLabel,
  canTransitionApplication,
  canTransitionVisit,
  isEditableApplication,
} from "@/lib/admissions-rules";

describe("admissions workflow", () => {
  it("keeps submitted applications out of final decisions until payment and examination", () => {
    expect(canTransitionApplication("SUBMITTED", "ACCEPTED")).toBe(false);
    expect(canTransitionApplication("SUBMITTED", "AWAITING_PAYMENT")).toBe(true);
    expect(canTransitionApplication("AWAITING_PAYMENT", "AWAITING_EXAMINATION")).toBe(true);
    expect(canTransitionApplication("AWAITING_EXAMINATION", "UNDER_REVIEW")).toBe(true);
    expect(canTransitionApplication("UNDER_REVIEW", "ACCEPTED")).toBe(true);
  });

  it("only allows applicants to edit drafts", () => {
    expect(isEditableApplication("DRAFT")).toBe(true);
    expect(isEditableApplication("SUBMITTED")).toBe(false);
  });

  it("prevents completed or cancelled visits from reopening", () => {
    expect(canTransitionVisit("REQUESTED", "CONFIRMED")).toBe(true);
    expect(canTransitionVisit("COMPLETED", "CONFIRMED")).toBe(false);
    expect(canTransitionVisit("CANCELLED", "REQUESTED")).toBe(false);
  });

  it("provides readable status labels and next states", () => {
    expect(applicationStatusLabel("AWAITING_EXAMINATION")).toBe("Awaiting Examination");
    expect(applicationNextStatuses("UNDER_REVIEW")).toEqual([
      "ACCEPTED",
      "WAITLISTED",
      "REJECTED",
    ]);
  });
});
