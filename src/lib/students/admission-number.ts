export function formatAdmissionNumber(input: {
  campusCode: string;
  year: number;
  sequence: number;
}) {
  const campusCode = input.campusCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,8}$/.test(campusCode)) {
    throw new Error("Campus code must contain 2–8 letters or numbers.");
  }
  if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2200) {
    throw new Error("Admission year is invalid.");
  }
  if (!Number.isInteger(input.sequence) || input.sequence < 1) {
    throw new Error("Admission sequence must be a positive integer.");
  }
  return `PET/${campusCode}/${input.year}/${String(input.sequence).padStart(4, "0")}`;
}

