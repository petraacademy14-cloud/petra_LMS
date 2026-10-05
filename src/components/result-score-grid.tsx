"use client";

import { useActionState, useEffect, useState } from "react";
import { resolveGrade } from "@/lib/academics";
import { saveTeacherScoreEntry } from "@/app/actions/results";

type Component = { id: string; label: string; max: number; scoreMax: number; weight: number };
type Student = { id: string; name: string; admissionNumber: string; comment: string; scores: (number | null)[] };

export function ResultScoreGrid({ sheetId, version, editable, components, students, bands }: {
  bands: { label: string; minScore: number; maxScore: number; remark: string }[];
  sheetId: string; version: string; editable: boolean; components: Component[]; students: Student[];
}) {
  const [state, action, pending] = useActionState(saveTeacherScoreEntry, { error: "", success: "" });
  const [values, setValues] = useState(() => Object.fromEntries(students.map((student) => [student.id, student.scores.map((score) => score === null ? "" : String(score))])));
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty || pending) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const warnBeforeNavigation = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.("a[href]");
      if (anchor && !window.confirm("You have unsaved scores. Leave without saving?")) event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    document.addEventListener("click", warnBeforeNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeaving);
      document.removeEventListener("click", warnBeforeNavigation, true);
    };
  }, [dirty, pending]);
  const [revision, setRevision] = useState(version);
  if (revision !== version) {
    setRevision(version);
    setValues(Object.fromEntries(students.map((student) => [student.id, student.scores.map((score) => score === null ? "" : String(score))])));
    setDirty(false);
  }
  return <form action={action} onChange={() => setDirty(true)}>
    <input name="sheetId" type="hidden" value={sheetId} />
    <input name="version" type="hidden" value={version} />
    <div className="border-b p-4 text-sm">
      <p>CAT 1 and CAT 2: 0–20 each. Exams: 0–60. Blank means not entered; enter 0 only for a genuine zero.</p>
      <p className="mt-2">Blank fields preserve saved scores. Save your draft before leaving. Submit saves all entered scores and sends the completed subject for approval.</p>
      {!editable && <p className="mt-2 font-bold">These scores are read-only. Ask an administrator if a correction is needed.</p>}
    </div>
    <fieldset disabled={pending || !editable}>
      <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Student</th>{components.map((component) => <th key={component.id}>{component.label}<br /><span className="text-xs font-normal">/{component.max}</span></th>)}<th>Total /100</th><th>Grade</th><th>Teacher comment</th></tr></thead>
        <tbody>{students.map((student) => {
          const row = values[student.id];
          const complete = row.every((value, index) => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= components[index].max);
          const total = complete ? Math.round(row.reduce((sum, value, index) => sum + Number(value) / components[index].scoreMax * components[index].weight, 0) * 100) / 100 : null;
          return <tr key={student.id}>
            <td><strong>{student.name}</strong><br /><span className="text-xs">{student.admissionNumber}</span></td>
            {components.map((component, index) => <td key={component.id}>
              <input aria-label={`${student.name} ${component.label}`} className="h-12 w-24 rounded-lg border px-2" type="number" min={0} max={component.max} step="0.01" inputMode="decimal" name={`score:${component.id}:${student.id}`} value={row[index]} onChange={(event) => {
                const next = [...row]; next[index] = event.target.value;
                setValues((previous) => ({ ...previous, [student.id]: next }));
              }} />
            </td>)}
            <td className="font-black">{total ?? "—"}</td><td>{total === null ? "—" : resolveGrade(total, bands)?.label ?? "—"}</td>
            <td><textarea aria-label={`${student.name} teacher comment`} className="min-h-20 min-w-48 rounded-lg border p-2" name={`comment:${student.id}`} defaultValue={student.comment} maxLength={500} /></td>
          </tr>;
        })}</tbody>
      </table></div>
      {editable && <div className="flex flex-wrap gap-3 border-t p-4">
        <button className="button button-secondary" type="submit" name="intent" value="save">{pending ? "Saving…" : "Save draft"}</button>
        <button className="button" type="submit" name="intent" value="submit" disabled={!students.length}>Save and submit for approval</button>
      </div>}
    </fieldset>
    <div aria-live="polite" className="px-4 pb-4 text-sm">
      {state.error && <p role="alert" className="font-bold text-[#b91118]">{state.error}</p>}
      {state.success && !dirty && <p className="font-bold text-green-800">{state.success}</p>}
      {dirty && !state.error && <p>Unsaved changes. Click Save draft before leaving this page.</p>}
    </div>
  </form>;
}
