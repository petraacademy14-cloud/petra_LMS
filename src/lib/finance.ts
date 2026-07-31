export type MoneyLike = number | string | { toString(): string };

export function toMoney(value: MoneyLike) {
  const amount = Number(value.toString());
  if (!Number.isFinite(amount)) throw new Error("INVALID_MONEY");
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function formatNaira(value: MoneyLike) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(toMoney(value));
}

export function formatReceiptNumber(input: {
  campusCode: string;
  year: number;
  sequence: number;
}) {
  const campus = input.campusCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
  if (!campus || input.sequence < 1 || !Number.isInteger(input.sequence)) {
    throw new Error("INVALID_RECEIPT_SEQUENCE");
  }
  return `PET/${campus}/${input.year}/${String(input.sequence).padStart(6, "0")}`;
}

export function ledgerAmount(
  type: "CHARGE" | "DISCOUNT" | "PAYMENT",
  amount: MoneyLike,
) {
  const normalized = Math.abs(toMoney(amount));
  return type === "CHARGE" ? normalized : -normalized;
}

export function calculateBalance(entries: MoneyLike[]) {
  return (
    Math.round(
      entries.reduce<number>(
        (total, value) => total + toMoney(value),
        0,
      ) * 100,
    ) / 100
  );
}

export function reconciliationVariance(
  expected: MoneyLike,
  declared: MoneyLike,
) {
  return Math.round((toMoney(declared) - toMoney(expected)) * 100) / 100;
}

export function buildReminderMessage(input: {
  studentName: string;
  termName: string;
  balance: MoneyLike;
  schoolName: string;
}) {
  return `Dear parent/guardian, ${input.studentName} has an outstanding ${input.termName} fee balance of ${formatNaira(input.balance)} at ${input.schoolName}. Please contact the school accounts office if your records differ.`;
}
