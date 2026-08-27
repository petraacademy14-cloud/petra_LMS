import { describe, expect, it } from "vitest";
import {
  feedbackLabel,
  isFeedbackChoice,
} from "@/lib/student-feedback";

describe("student feedback choices", () => {
  it("accepts published choice values", () => {
    expect(isFeedbackChoice("feedingStatus", "ATE_ALL")).toBe(true);
    expect(isFeedbackChoice("healthStatus", "SICK")).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(isFeedbackChoice("conductStatus", "UNKNOWN")).toBe(false);
  });

  it("returns parent-friendly labels", () => {
    expect(feedbackLabel("arrivalStatus", "ON_TIME")).toBe("Arrived on time");
    expect(feedbackLabel("toiletStatus", null)).toBe("Not recorded");
  });
});
