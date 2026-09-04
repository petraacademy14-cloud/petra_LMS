import { describe, expect, it } from "vitest";
import { previewAccountConfig } from "./preview-account-config";

describe("previewAccountConfig", () => {
  it("uses the existing owner variables as safe preview fallbacks", () => {
    const config = previewAccountConfig({
      SEED_OWNER_EMAIL: " OWNER@PETRAACADEMY.TEST ",
      SEED_OWNER_PASSWORD: "a-long-preview-password",
    });

    expect(config.owner.email).toBe("owner@petraacademy.test");
    expect(config.password).toBe("a-long-preview-password");
  });

  it("allows preview-specific credentials to override the owner variables", () => {
    const config = previewAccountConfig({
      SEED_OWNER_EMAIL: "owner@petraacademy.test",
      SEED_OWNER_PASSWORD: "owner-preview-password",
      SEED_PREVIEW_OWNER_EMAIL: "preview-owner@petraacademy.test",
      SEED_PREVIEW_ACCESS_PASSWORD: "shared-preview-password",
    });

    expect(config.owner.email).toBe("preview-owner@petraacademy.test");
    expect(config.password).toBe("shared-preview-password");
  });

  it("provides stable student and parent usernames", () => {
    const config = previewAccountConfig({
      SEED_OWNER_PASSWORD: "a-long-preview-password",
    });

    expect(config.student.username).toBe("petra-preview-student");
    expect(config.parent.username).toBe("petra-preview-parent");
  });

  it("rejects a missing or short preview password", () => {
    expect(() => previewAccountConfig({})).toThrow(/at least 10 characters/);
    expect(() =>
      previewAccountConfig({ SEED_OWNER_PASSWORD: "too-short" }),
    ).toThrow(/at least 10 characters/);
  });
});
