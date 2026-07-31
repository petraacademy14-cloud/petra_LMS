import { describe, expect, it } from "vitest";
import {
  buildReminderMessage,
  calculateBalance,
  formatReceiptNumber,
  ledgerAmount,
  reconciliationVariance,
} from "@/lib/finance";

describe("finance rules", () => {
  it("creates stable, campus-scoped receipt numbers", () => {
    expect(
      formatReceiptNumber({
        campusCode: "awk",
        year: 2026,
        sequence: 42,
      }),
    ).toBe("PET/AWK/2026/000042");
  });

  it("uses signed immutable ledger amounts to support part payments", () => {
    const entries = [
      ledgerAmount("CHARGE", 100_000),
      ledgerAmount("DISCOUNT", 5_000),
      ledgerAmount("PAYMENT", 40_000),
    ];
    expect(calculateBalance(entries)).toBe(55_000);
  });

  it("uses equal-and-opposite entries for reversals", () => {
    const payment = ledgerAmount("PAYMENT", 25_000);
    expect(calculateBalance([100_000, payment, -payment])).toBe(100_000);
  });

  it("reports declared less expected as a negative variance", () => {
    expect(reconciliationVariance(50_000, 49_500)).toBe(-500);
  });

  it("generates a clear reminder without claiming it was sent", () => {
    expect(
      buildReminderMessage({
        studentName: "Ada Okafor",
        termName: "First Term",
        balance: 12_500,
        schoolName: "Petra Academy",
      }),
    ).toContain("outstanding First Term fee balance of ₦12,500.00");
  });
});
