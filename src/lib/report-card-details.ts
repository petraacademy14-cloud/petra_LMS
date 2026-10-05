import { z } from "zod";

const line = z.string().trim().max(160).default("");
const comment = z.string().trim().max(1000).default("");
export const reportDetailsSchema = z.object({
  format: z.enum(["AUTO", "NURSERY", "SECONDARY"]).default("AUTO"),
  schoolHeading: line,
  schoolAddress: z.string().trim().max(240).default(""),
  nextTermBegins: z.string().refine((s) => !s || /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s, "Enter a valid date.").default(""),
  conduct: comment,
  negativeTraits: comment,
  positiveTraits: comment,
  activities: comment,
  teacherComment: comment,
  principalComment: comment,
  teacherName: line,
  principalName: line,
});
export type ReportDetails = z.infer<typeof reportDetailsSchema>;
export function readReportDetails(value: unknown): ReportDetails {
  const parsed = reportDetailsSchema.safeParse(value);
  return parsed.success ? parsed.data : reportDetailsSchema.parse({});
}
export function reportFormat(className: string, details: ReportDetails) {
  if (details.format !== "AUTO") return details.format;
  return /nursery|pre.?nursery|reception|creche/i.test(className) ? "NURSERY" : "SECONDARY";
}
