import { describe, expect, it } from "vitest";
import {
  normalizeHeader,
  normalizePhone,
  validateImportRow,
} from "./import-validation";

const validRow = {
  admission_number: "",
  first_name: "Ada",
  middle_name: "",
  last_name: "Okafor",
  date_of_birth: "2017-04-12",
  gender: "female",
  admission_date: "2026-09-07",
  address: "Awka",
  guardian_first_name: "Chidi",
  guardian_last_name: "Okafor",
  guardian_relationship: "father",
  guardian_phone: "0803 123 4567",
  guardian_email: "chidi@example.com",
  guardian_occupation: "Engineer",
};

describe("student import validation", () => {
  it("normalizes familiar spreadsheet headings", () => {
    expect(normalizeHeader("Guardian Phone Number")).toBe(
      "guardian_phone_number",
    );
  });

  it("normalizes Nigerian local phone numbers", () => {
    expect(normalizePhone("0803-123-4567")).toBe("+2348031234567");
  });

  it("accepts and normalizes a complete row", () => {
    const result = validateImportRow(validRow);
    expect(result.isValid).toBe(true);
    expect(result.value?.gender).toBe("FEMALE");
    expect(result.value?.guardian_phone).toBe("+2348031234567");
  });

  it("reports every invalid field without importing the row", () => {
    const result = validateImportRow({
      ...validRow,
      first_name: "",
      admission_date: "07/09/2026",
      guardian_phone: "123",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.first_name).toBeDefined();
    expect(result.errors.admission_date).toBeDefined();
    expect(result.errors.guardian_phone).toBeDefined();
  });
});
