import { describe, expect, it } from "vitest";
import {
  availableToSubmit,
  canApplicantSeeCharge,
  chargeBalance,
  nextApplicationStatusFromBalances,
} from "@/lib/applicant-finance";

describe("applicant finance rules", () => {
  it("supports part payments without allowing over-submission", () => {
    expect(chargeBalance(15000, 4000)).toBe(11000);
    expect(availableToSubmit(15000, 4000, 3000)).toBe(8000);
    expect(availableToSubmit(15000, 15000, 0)).toBe(0);
  });

  it("hides the examination charge until the form charge is settled", () => {
    expect(canApplicantSeeCharge("FORM", false)).toBe(true);
    expect(canApplicantSeeCharge("EXAM", false)).toBe(false);
    expect(canApplicantSeeCharge("EXAM", true)).toBe(true);
  });

  it("unlocks examination only when both charges are fully settled", () => {
    expect(
      nextApplicationStatusFromBalances({
        formChargeExists: true,
        formBalance: 0,
        examChargeExists: true,
        examBalance: 0,
      }),
    ).toBe("AWAITING_EXAMINATION");
    expect(
      nextApplicationStatusFromBalances({
        formChargeExists: true,
        formBalance: 0,
        examChargeExists: true,
        examBalance: 5000,
      }),
    ).toBe("AWAITING_PAYMENT");
  });
});
