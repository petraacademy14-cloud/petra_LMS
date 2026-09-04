import { describe, expect, it } from "vitest";
import { betterAuthBaseURL } from "@/lib/auth-url";

describe("betterAuthBaseURL", () => {
  it("accepts both generated and stable Vercel deployment hosts", () => {
    expect(
      betterAuthBaseURL({
        VERCEL_URL: "petra-lms-build-123.vercel.app",
        VERCEL_BRANCH_URL: "petra-lms-git-preview-team.vercel.app",
        VERCEL_PROJECT_PRODUCTION_URL: "petra-lms.vercel.app",
        BETTER_AUTH_URL: "https://an-old-preview.vercel.app",
      }),
    ).toEqual({
      allowedHosts: [
        "petra-lms-build-123.vercel.app",
        "petra-lms-git-preview-team.vercel.app",
        "petra-lms.vercel.app",
      ],
      fallback: "https://petra-lms-build-123.vercel.app",
      protocol: "https",
    });
  });

  it("uses the configured URL outside Vercel", () => {
    expect(
      betterAuthBaseURL({ BETTER_AUTH_URL: "http://localhost:3000" }),
    ).toBe("http://localhost:3000");
  });
});
