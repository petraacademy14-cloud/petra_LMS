import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PETRA_LOGO_WEBP } from "@/lib/brand-logo/official-logo";

describe("official Petra Academy logo", () => {
  it("reconstructs the approved WebP without corruption", () => {
    expect(PETRA_LOGO_WEBP.byteLength).toBe(30_228);
    expect(PETRA_LOGO_WEBP.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(PETRA_LOGO_WEBP.subarray(8, 12).toString("ascii")).toBe("WEBP");
    expect(createHash("sha256").update(PETRA_LOGO_WEBP).digest("hex")).toBe(
      "f033c2ed8c28c38a243c284e37ab31b242a8590ded1f7e0b4ac900b0ebcdb1d3",
    );
  });
});
