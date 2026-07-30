import { readSheet } from "read-excel-file/node";
import { z } from "zod";

export const importColumns = [
  "admission_number",
  "first_name",
  "middle_name",
  "last_name",
  "gender",
  "date_of_birth",
  "admission_date",
  "campus_code",
  "class_code",
  "arm_code",
  "academic_session",
  "address",
  "guardian_1_first_name",
  "guardian_1_last_name",
  "guardian_1_phone",
  "guardian_1_email",
  "guardian_1_relationship",
  "guardian_2_first_name",
  "guardian_2_last_name",
  "guardian_2_phone",
  "guardian_2_email",
  "guardian_2_relationship",
] as const;

const optionalText = z.string().trim().max(160).optional().default("");
const dateText = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const relationship = z
  .enum(["FATHER", "MOTHER", "GUARDIAN", "SIBLING", "RELATIVE", "OTHER"])
  .default("GUARDIAN");

const importRowSchema = z.object({
  admission_number: optionalText,
  first_name: z.string().trim().min(2).max(80),
  middle_name: optionalText,
  last_name: z.string().trim().min(2).max(80),
  gender: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.enum(["MALE", "FEMALE"])),
  date_of_birth: z.union([dateText, z.literal("")]).default(""),
  admission_date: dateText,
  campus_code: z.string().trim().min(2).max(6).toUpperCase(),
  class_code: z.string().trim().min(2).max(16).toUpperCase(),
  arm_code: z.string().trim().min(1).max(16).toUpperCase(),
  academic_session: z.string().trim().min(4).max(40),
  address: optionalText,
  guardian_1_first_name: z.string().trim().min(2).max(80),
  guardian_1_last_name: z.string().trim().min(2).max(80),
  guardian_1_phone: z.string().trim().min(7).max(24),
  guardian_1_email: z.union([z.email(), z.literal("")]).default(""),
  guardian_1_relationship: relationship,
  guardian_2_first_name: optionalText,
  guardian_2_last_name: optionalText,
  guardian_2_phone: optionalText,
  guardian_2_email: z.union([z.email(), z.literal("")]).default(""),
  guardian_2_relationship: relationship,
});

export type StudentImportRow = z.infer<typeof importRowSchema>;

export type ImportRowError = {
  row: number;
  field: string;
  message: string;
};

export type StudentImportResult = {
  rows: StudentImportRow[];
  errors: ImportRowError[];
};

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

function parseCsv(content: string) {
  return content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map(parseCsvLine);
}

function cellText(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value === null || value === undefined ? "" : String(value).trim();
}

export function validateStudentImportTable(table: unknown[][]): StudentImportResult {
  if (!table.length) {
    return {
      rows: [],
      errors: [{ row: 1, field: "file", message: "The file is empty." }],
    };
  }

  const headers = table[0].map((cell) => cellText(cell).toLowerCase());
  const missing = importColumns.filter((column) => !headers.includes(column));
  if (missing.length) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          field: "headers",
          message: `Missing columns: ${missing.join(", ")}`,
        },
      ],
    };
  }

  const rows: StudentImportRow[] = [];
  const errors: ImportRowError[] = [];
  const admissions = new Set<string>();

  table.slice(1).forEach((cells, rowIndex) => {
    const source = Object.fromEntries(
      importColumns.map((column) => [
        column,
        cellText(cells[headers.indexOf(column)]),
      ]),
    );
    const parsed = importRowSchema.safeParse(source);
    const row = rowIndex + 2;

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          row,
          field: String(issue.path[0] ?? "row"),
          message: issue.message,
        });
      }
      return;
    }

    if (
      parsed.data.guardian_2_phone &&
      (!parsed.data.guardian_2_first_name || !parsed.data.guardian_2_last_name)
    ) {
      errors.push({
        row,
        field: "guardian_2",
        message: "Guardian 2 needs first name, last name and phone.",
      });
      return;
    }

    const admission = parsed.data.admission_number.toUpperCase();
    if (admission && admissions.has(admission)) {
      errors.push({
        row,
        field: "admission_number",
        message: "Admission number is duplicated in this file.",
      });
      return;
    }
    if (admission) admissions.add(admission);
    rows.push(parsed.data);
  });

  return { rows, errors };
}

export async function parseStudentImportFile(
  fileName: string,
  bytes: ArrayBuffer,
) {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "csv") {
    return validateStudentImportTable(
      parseCsv(new TextDecoder().decode(bytes)),
    );
  }
  if (extension === "xlsx") {
    const rows = await readSheet(Buffer.from(bytes));
    return validateStudentImportTable(rows);
  }
  return {
    rows: [],
    errors: [
      {
        row: 1,
        field: "file",
        message: "Upload a .csv or .xlsx file.",
      },
    ],
  } satisfies StudentImportResult;
}

export function studentImportTemplateCsv() {
  const example = [
    "",
    "Ada",
    "Chiamaka",
    "Okafor",
    "FEMALE",
    "2018-05-14",
    "2026-09-07",
    "AWK",
    "PRI-2",
    "A",
    "2026/2027",
    "Awka, Anambra",
    "Chinedu",
    "Okafor",
    "08030000000",
    "chinedu@example.com",
    "FATHER",
    "",
    "",
    "",
    "",
    "GUARDIAN",
  ];
  return `${importColumns.join(",")}\n${example.join(",")}\n`;
}
