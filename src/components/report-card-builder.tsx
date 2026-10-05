"use client";
import { useActionState } from "react";
import { saveReportDetails } from "@/app/actions/report-cards";
import type { ReportDetails } from "@/lib/report-card-details";

export function ReportCardBuilder({ studentId, termId, version, details }: { studentId: string; termId: string; version: string; details: ReportDetails }) {
  const [state, action, pending] = useActionState(saveReportDetails, {});
  return <section className="card mt-6 p-6 print:hidden">
    <h2 className="text-lg font-black">School report PDF builder</h2>
    <p className="mt-2 text-sm">Published marks, class highest and lowest scores, and submitted attendance fill automatically. Save comments here before downloading. Signature spaces remain available for signing the printed report.</p>
    <form action={action} className="mt-4">
      <input type="hidden" name="studentId" value={studentId} /><input type="hidden" name="termId" value={termId} /><input type="hidden" name="version" value={version} />
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
        <label>Report format<select name="format" defaultValue={details.format} className="input"><option value="AUTO">Use class level</option><option value="NURSERY">Nursery</option><option value="SECONDARY">Secondary</option></select></label>
        <label>Next term begins<input className="input" name="nextTermBegins" type="date" defaultValue={details.nextTermBegins} /></label>
        {([["schoolHeading", "School heading (optional override)"], ["schoolAddress", "School address (optional override)"], ["teacherName", "Teacher name"], ["principalName", "Principal name"]] as const).map(([key, label]) => <label key={key}>{label}<input className="input" name={key} maxLength={key === "schoolAddress" ? 240 : 160} defaultValue={details[key]} /></label>)}
        {([["conduct", "Conduct (nursery)"], ["negativeTraits", "Negative traits (nursery)"], ["positiveTraits", "Positive traits (nursery)"], ["activities", "Extra curricular activities (nursery)"], ["teacherComment", "Teacher's overall comment"], ["principalComment", "Principal's comment"]] as const).map(([key, label]) => <label key={key}>{label}<textarea className="input" name={key} rows={3} maxLength={1000} defaultValue={details[key]} /></label>)}
        <button className="button sm:col-span-2" type="submit">{pending ? "Saving…" : "Save report details"}</button>
      </fieldset>
      {state.error && <p role="alert" className="mt-3 text-red-700">{state.error}</p>}{state.success && <p role="status" className="mt-3 text-green-700">{state.success}</p>}
    </form>
  </section>;
}
