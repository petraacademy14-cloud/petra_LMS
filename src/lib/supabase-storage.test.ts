import { describe, expect, it } from "vitest";
import { supabaseStorageAdminHeaders } from "@/lib/supabase-storage";

describe("Supabase Storage admin headers", () => {
  it("uses new secret keys only in the apikey header", () => {
    expect(supabaseStorageAdminHeaders("sb_secret_example")).toEqual({
      apikey: "sb_secret_example",
    });
  });

  it("keeps Bearer authentication for legacy service-role JWTs", () => {
    expect(supabaseStorageAdminHeaders("legacy.jwt.key")).toEqual({
      apikey: "legacy.jwt.key",
      Authorization: "Bearer legacy.jwt.key",
    });
  });

  it("adds request-specific headers without changing authentication", () => {
    expect(
      supabaseStorageAdminHeaders("sb_secret_example", {
        "Content-Type": "application/pdf",
        "x-upsert": "false",
      }),
    ).toEqual({
      apikey: "sb_secret_example",
      "Content-Type": "application/pdf",
      "x-upsert": "false",
    });
  });
});

