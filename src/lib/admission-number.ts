const CAMPUS_CODE = /^[A-Z0-9]{2,6}$/;

export function formatAdmissionNumber(input: {
  campusCode: string;
  year: number;
  sequence: number;
}) {
  const campusCode = input.campusCode.trim().toUpperCase();
  if (!CAMPUS_CODE.test(campusCode)) {
    throw new Error("INVALID_CAMPUS_CODE");
  }
  if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2200) {
    throw new Error("INVALID_ADMISSION_YEAR");
  }
  if (
    !Number.isInteger(input.sequence) ||
    input.sequence < 1 ||
    input.sequence > 999999
  ) {
    throw new Error("INVALID_ADMISSION_SEQUENCE");
  }

  return `PET/${campusCode}/${input.year}/${String(input.sequence).padStart(4, "0")}`;
}
