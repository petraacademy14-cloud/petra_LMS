import "server-only";

import { importColumns, normalizeHeader } from "./import-validation";

const aliases: Record<string, (typeof importColumns)[number]> = {
  admission_no: "admission_number",
  admission_number: "admission_number",
  student_id: "admission_number",
  firstname: "first_name",
  first_name: "first_name",
  middlename: "middle_name",
  middle_name: "middle_name",
  surname: "last_name",
  lastname: "last_name",
  last_name: "last_name",
  dob: "date_of_birth",
  date_of_birth: "date_of_birth",
  gender: "gender",
  admission_date: "admission_date",
  date_admitted: "admission_date",
  address: "address",
  guardian_first_name: "guardian_first_name",
  parent_first_name: "guardian_first_name",
  guardian_last_name: "guardian_last_name",
  parent_last_name: "guardian_last_name",
  guardian_relationship: "guardian_relationship",
  relationship: "guardian_relationship",
  guardian_phone: "guardian_phone",
  guardian_phone_number: "guardian_phone",
  parent_phone: "guardian_phone",
  guardian_email: "guardian_email",
  parent_email: "guardian_email",
  guardian_occupation: "guardian_occupation",
  parent_occupation: "guardian_occupation",
};

export async function parseStudentFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!["csv", "xlsx"].includes(extension ?? "")) {
    throw new Error("Upload a .csv or .xlsx file.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("The import file must not exceed 5 MB.");
  }

  const matrix =
    extension === "csv"
      ? parseCsv(await file.text())
      : await parseWorkbook(Buffer.from(await file.arrayBuffer()));

  if (matrix.length < 2) throw new Error("The file has no student rows.");
  if (matrix.length > 1001) {
    throw new Error("Import at most 1,000 students in one file.");
  }

  const headers = matrix[0].map((header) => aliases[normalizeHeader(header)]);
  const required = [
    "first_name",
    "last_name",
    "admission_date",
    "guardian_first_name",
    "guardian_last_name",
    "guardian_relationship",
    "guardian_phone",
  ];
  const missing = required.filter((name) => !headers.includes(name as never));
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(", ")}`);
  }

  return matrix.slice(1).flatMap((cells, index) => {
    if (cells.every((cell) => String(cell ?? "").trim() === "")) return [];
    const data: Record<string, unknown> = {};
    headers.forEach((header, cellIndex) => {
      if (header) data[header] = formatCell(cells[cellIndex]);
    });
    return [{ rowNumber: index + 2, data }];
  });
}

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"' && quoted && input[i + 1] === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

async function parseWorkbook(buffer: Buffer) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  await workbook.xlsx.load(
    buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];
  const rows: unknown[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    rows.push(values);
  });
  return rows;
}

function formatCell(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value && typeof value === "object" && "text" in value) {
    return String((value as { text: unknown }).text);
  }
  return String(value ?? "").trim();
}
