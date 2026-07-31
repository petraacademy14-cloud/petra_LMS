export type ContentWorkflowStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

const transitions: Record<ContentWorkflowStatus, readonly ContentWorkflowStatus[]> = {
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["DRAFT", "APPROVED"],
  APPROVED: ["PUBLISHED"],
  PUBLISHED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransitionContent(current: ContentWorkflowStatus, next: ContentWorkflowStatus) {
  return transitions[current].includes(next);
}

export function slugifyContent(value: string) {
  const slug = value.trim().toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  if (!slug) throw new Error("INVALID_SLUG");
  return slug;
}

export function renderCommunicationTemplate(
  body: string,
  variables: Record<string, string | number>,
) {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : `{{${key}}}`,
  );
}

export function validateAudience(input: {
  audience: "SCHOOL" | "CAMPUS" | "CLASS";
  campusId?: string | null;
  classArmId?: string | null;
}) {
  if (input.audience === "SCHOOL") return !input.campusId && !input.classArmId;
  if (input.audience === "CAMPUS") return Boolean(input.campusId) && !input.classArmId;
  return Boolean(input.campusId && input.classArmId);
}
