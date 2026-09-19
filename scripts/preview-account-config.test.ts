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

  it("provides stable campus administrator emails", () => {
    const config = previewAccountConfig({
      SEED_OWNER_PASSWORD: "a-long-preview-password",
    });

    expect(config.awkaAdmin.email).toBe(
      "admin.awka.preview@petraacademy.test",
    );
    expect(config.nnewiAdmin.email).toBe(
      "admin.nnewi.preview@petraacademy.test",
    );
  });

  it("allows campus administrator identity overrides", () => {
    const config = previewAccountConfig({
      SEED_OWNER_PASSWORD: "a-long-preview-password",
      SEED_PREVIEW_AWKA_ADMIN_NAME: " Awka Test Admin ",
      SEED_PREVIEW_AWKA_ADMIN_EMAIL: " AWKA.ADMIN@PETRAACADEMY.TEST ",
      SEED_PREVIEW_NNEWI_ADMIN_NAME: " Nnewi Test Admin ",
      SEED_PREVIEW_NNEWI_ADMIN_EMAIL: " NNEWI.ADMIN@PETRAACADEMY.TEST ",
    });

    expect(config.awkaAdmin).toEqual({
      name: "Awka Test Admin",
      email: "awka.admin@petraacademy.test",
    });
    expect(config.nnewiAdmin).toEqual({
      name: "Nnewi Test Admin",
      email: "nnewi.admin@petraacademy.test",
    });
  });

  it("rejects a missing or short preview password", () => {
    expect(() => previewAccountConfig({})).toThrow(/at least 10 characters/);
    expect(() =>
      previewAccountConfig({ SEED_OWNER_PASSWORD: "too-short" }),
    ).toThrow(/at least 10 characters/);
  });
});
