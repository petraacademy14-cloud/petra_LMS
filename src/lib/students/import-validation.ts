import { z } from "zod";

export const importColumns = [
  "admission_number",
  "first_name",
  "middle_name",
  "last_name",
  "date_of_birth",
  "gender",
  "admission_date",
  "address",
  "guardian_first_name",
  "guardian_last_name",
  "guardian_relationship",
  "guardian_phone",
  "guardian_email",
  "guardian_occupation",
] as const;

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

const rowSchema = z.object({
  admission_number: optionalText,
  first_name: z.string().trim().min(1, "First name is required").max(80),
  middle_name: optionalText,
  last_name: z.string().trim().min(1, "Last name is required").max(80),
  date_of_birth: optionalText.refine(
    (value) => !value || isIsoDate(value),
    "Use date format YYYY-MM-DD",
  ),
  gender: optionalText.refine(
    (value) => !value || ["MALE", "FEMALE"].includes(value.toUpperCase()),
    "Gender must be MALE or FEMALE",
  ),
  admission_date: z
    .string()
    .trim()
    .refine(isIsoDate, "Admission date is required in YYYY-MM-DD format"),
  address: optionalText,
  guardian_first_name: z
    .string()
    .trim()
    .min(1, "Guardian first name is required")
    .max(80),
  guardian_last_name: z
    .string()
    .trim()
    .min(1, "Guardian last name is required")
    .max(80),
  guardian_relationship: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (value) =>
        ["FATHER", "MOTHER", "GUARDIAN", "SIBLING", "RELATIVE", "OTHER"].includes(
          value,
        ),
      "Guardian relationship is invalid",
    ),
  guardian_phone: z
    .string()
    .trim()
    .transform(normalizePhone)
    .refine(
      (value) => /^\+?[0-9]{10,15}$/.test(value),
      "Guardian phone must contain 10–15 digits",
    ),
  guardian_email: optionalText.refine(
    (value) => !value || z.email().safeParse(value).success,
    "Guardian email is invalid",
  ),
  guardian_occupation: optionalText,
});

export type ValidStudentImportRow = z.infer<typeof rowSchema>;
export type StudentImportValidation = {
  data: Record<string, string>;
  errors: Record<string, string[]>;
  isValid: boolean;
  value?: ValidStudentImportRow;
};

export function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function normalizePhone(value: string) {
  const compact = value.replace(/[^\d+]/g, "");
  if (compact.startsWith("234") && !compact.startsWith("+")) return `+${compact}`;
  if (compact.startsWith("0") && compact.length === 11) {
    return `+234${compact.slice(1)}`;
  }
  return compact;
}

export function validateImportRow(
  raw: Record<string, unknown>,
): StudentImportValidation {
  const data = Object.fromEntries(
    importColumns.map((column) => [column, String(raw[column] ?? "").trim()]),
  );
  const parsed = rowSchema.safeParse(data);
  if (parsed.success) {
    return {
      data,
      errors: {},
      isValid: true,
      value: {
        ...parsed.data,
        gender: parsed.data.gender?.toUpperCase(),
      },
    };
  }
  const errors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "row");
    errors[key] = [...(errors[key] ?? []), issue.message];
  }
  return { data, errors, isValid: false };
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

