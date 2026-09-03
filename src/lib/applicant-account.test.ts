import { describe, expect, it } from "vitest";
import { generateTemporaryApplicantPassword } from "@/lib/applicant-account";

describe("applicant account credentials", () => {
  it("generates strong temporary passwords without ambiguous characters", () => {
    const password = generateTemporaryApplicantPassword();

    expect(password).toMatch(/^Petra!\d[A-HJ-NP-Za-km-z2-9]{9}$/);
    expect(password.length).toBeGreaterThanOrEqual(10);
  });

  it("generates a new credential for each reset", () => {
    expect(generateTemporaryApplicantPassword()).not.toBe(
      generateTemporaryApplicantPassword(),
    );
  });
});
