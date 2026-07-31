export const entranceFeeKinds = ["FORM", "EXAM"] as const;
export type EntranceFeeKind = (typeof entranceFeeKinds)[number];

export const applicantPaymentStatuses = [
  "PENDING_VERIFICATION",
  "VERIFIED",
  "REVERSED",
] as const;
export type ApplicantPaymentStatus = (typeof applicantPaymentStatuses)[number];

export const applicantPaymentMethods = ["CASH", "TRANSFER", "POS", "ONLINE"] as const;
export type ApplicantPaymentMethod = (typeof applicantPaymentMethods)[number];

export function entranceFeeLabel(kind: EntranceFeeKind) {
  return kind === "FORM" ? "Entrance form fee" : "Entrance examination fee";
}

export function applicantPaymentStatusLabel(status: ApplicantPaymentStatus) {
  return {
    PENDING_VERIFICATION: "Awaiting verification",
    VERIFIED: "Verified",
    REVERSED: "Reversed",
  }[status];
}

export function chargeBalance(amount: number, verified: number) {
  return Math.max(0, Math.round((amount - verified) * 100) / 100);
}

export function availableToSubmit(
  amount: number,
  verified: number,
  pending: number,
) {
  return Math.max(0, Math.round((amount - verified - pending) * 100) / 100);
}

export function canApplicantSeeCharge(kind: EntranceFeeKind, formSettled: boolean) {
  return kind === "FORM" || formSettled;
}

export function nextApplicationStatusFromBalances(input: {
  formChargeExists: boolean;
  formBalance: number;
  examChargeExists: boolean;
  examBalance: number;
}) {
  if (!input.formChargeExists || input.formBalance > 0) return "AWAITING_PAYMENT" as const;
  if (!input.examChargeExists || input.examBalance > 0) return "AWAITING_PAYMENT" as const;
  return "AWAITING_EXAMINATION" as const;
}

export function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(value);
}
