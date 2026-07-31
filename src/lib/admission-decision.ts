export const admissionDecisionOutcomes = [
  "ACCEPTED",
  "WAITLISTED",
  "REJECTED",
] as const;

export type AdmissionDecisionOutcome =
  (typeof admissionDecisionOutcomes)[number];

export const admissionOfferResponses = [
  "NOT_APPLICABLE",
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
] as const;

export type AdmissionOfferResponse =
  (typeof admissionOfferResponses)[number];

export function decisionLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function isOfferExpired(
  response: AdmissionOfferResponse,
  offerExpiresAt: Date | null,
  now = new Date(),
) {
  return response === "PENDING" && Boolean(offerExpiresAt && offerExpiresAt <= now);
}

export function canRespondToOffer(
  response: AdmissionOfferResponse,
  offerExpiresAt: Date | null,
  now = new Date(),
) {
  return response === "PENDING" && Boolean(offerExpiresAt && offerExpiresAt > now);
}

export function canConvertAdmission(input: {
  outcome: AdmissionDecisionOutcome;
  offerResponse: AdmissionOfferResponse;
  convertedStudentId: string | null;
}) {
  return (
    input.outcome === "ACCEPTED" &&
    input.offerResponse === "ACCEPTED" &&
    !input.convertedStudentId
  );
}

export function guardianRelationship(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("father") || normalized === "dad") return "FATHER" as const;
  if (normalized.includes("mother") || normalized === "mum" || normalized === "mom") {
    return "MOTHER" as const;
  }
  if (normalized.includes("sibling") || normalized.includes("brother") || normalized.includes("sister")) {
    return "SIBLING" as const;
  }
  if (normalized.includes("relative") || normalized.includes("aunt") || normalized.includes("uncle")) {
    return "RELATIVE" as const;
  }
  if (normalized.includes("guardian")) return "GUARDIAN" as const;
  return "OTHER" as const;
}
