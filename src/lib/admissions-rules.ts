export const applicationStatuses = [
  "DRAFT",
  "SUBMITTED",
  "AWAITING_PAYMENT",
  "AWAITING_EXAMINATION",
  "UNDER_REVIEW",
  "ACCEPTED",
  "WAITLISTED",
  "REJECTED",
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];

export const visitStatuses = [
  "REQUESTED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type VisitStatus = (typeof visitStatuses)[number];

// SUBMITTED → AWAITING_PAYMENT and AWAITING_PAYMENT → AWAITING_EXAMINATION
// are controlled by the applicant finance workflow, not manual staff status changes.
const transitions: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["REJECTED"],
  AWAITING_PAYMENT: ["REJECTED"],
  AWAITING_EXAMINATION: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["ACCEPTED", "WAITLISTED", "REJECTED"],
  WAITLISTED: ["ACCEPTED", "REJECTED"],
  ACCEPTED: [],
  REJECTED: [],
};

const visitTransitions: Record<VisitStatus, readonly VisitStatus[]> = {
  REQUESTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionApplication(
  current: ApplicationStatus,
  next: ApplicationStatus,
) {
  return transitions[current].includes(next);
}

export function applicationNextStatuses(status: ApplicationStatus) {
  return transitions[status];
}

export function canTransitionVisit(current: VisitStatus, next: VisitStatus) {
  return visitTransitions[current].includes(next);
}

export function visitNextStatuses(status: VisitStatus) {
  return visitTransitions[status];
}

export function isEditableApplication(status: ApplicationStatus) {
  return status === "DRAFT";
}

export function enumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function applicationStatusLabel(status: ApplicationStatus) {
  return enumLabel(status);
}
