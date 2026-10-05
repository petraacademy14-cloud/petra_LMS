import { z } from "zod";

export function resultScoreLimit(component: {
  kind: string;
  maxScore: number | { toString(): string };
}) {
  const configured = Number(component.maxScore);
  const cap = component.kind === "EXAM" ? 60 : 20;
  return Math.min(configured, cap);
}

export function parseResultScore(raw: FormDataEntryValue | null, max: number): number | null {
  if (raw === null || (typeof raw === "string" && raw.trim() === "")) return null;
  const text = z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/, "Enter a score with at most two decimal places.").parse(raw);
  return z.number().finite().min(0).max(max).parse(Number(text));
}

export function resultEntryError(error: unknown): string {
  if (error instanceof z.ZodError) return "Check your scores. CAT 1 and CAT 2 must be 0–20; exams must be 0–60. Use at most two decimal places.";
  const message = error instanceof Error ? error.message : "";
  if (message.includes("CONFLICT:")) return "These results changed in another tab. Refresh before entering and saving again. Your changes have not been saved.";
  if (message.includes("INCOMPLETE_RESULT_SHEET")) return "Save a score for every student in all three columns before submitting. Blank scores are incomplete; enter 0 only for a genuine zero.";
  if (message.includes("RESULT_SHEET_STATE") || message.includes("RESULT_TRANSITION")) return "This result is no longer editable. Refresh to see its current status.";
  return "Unable to save results. Your changes have not been saved. Try again or contact an administrator.";
}
