import { describe, expect, it } from "vitest";
import {
  applicationNextStatuses,
  applicationStatusLabel,
  canTransitionApplication,
  canTransitionVisit,
  isEditableApplication,
} from "@/lib/admissions-rules";

describe("admissions workflow", () => {
  it("keeps payment and final decision transitions under their dedicated workflows", () => {
    expect(canTransitionApplication("SUBMITTED", "ACCEPTED")).toBe(false);
    expect(canTransitionApplication("SUBMITTED", "AWAITING_PAYMENT")).toBe(false);
    expect(canTransitionApplication("AWAITING_PAYMENT", "AWAITING_EXAMINATION")).toBe(false);
    expect(canTransitionApplication("AWAITING_EXAMINATION", "UNDER_REVIEW")).toBe(true);
    expect(canTransitionApplication("UNDER_REVIEW", "ACCEPTED")).toBe(false);
    expect(canTransitionApplication("WAITLISTED", "ACCEPTED")).toBe(false);
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

  it("provides readable labels and stops generic updates at review", () => {
    expect(applicationStatusLabel("AWAITING_EXAMINATION")).toBe("Awaiting Examination");
    expect(applicationNextStatuses("UNDER_REVIEW")).toEqual([]);
  });
});
