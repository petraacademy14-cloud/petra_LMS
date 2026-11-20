"use client";
import { useActionState, useState } from "react";
import { saveOffering, saveSelection, importCatalog, savePathway } from "@/app/actions/curriculum";
import type { ActionState } from "@/app/actions/foundation";

type Named={id:string;name:string};
type Scoped=Named & {campusId:string};
type Offering={id:string;campusId:string;classArmId:string;termId:string;displayName:string;groupName:string|null;pathway:string|null;isRequired:boolean};
type Enrollment=Scoped & {classArmId:string;pathway:string|null};
const initial:ActionState={status:"idle",message:""};
const field="h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3";
function Options({items}:{items:Named[]}) {return <><option value="">Select…</option>{items.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</>;}
export function CurriculumForms({campuses,terms,arms,subjects,offerings,enrollments}:{campuses:Named[];terms:Scoped[];arms:Scoped[];subjects:Scoped[];offerings:Offering[];enrollments:Enrollment[]}) {
  const [campus,setCampus]=useState("");
  const [arm,setArm]=useState("");
  const [term,setTerm]=useState("");
  const [student,setStudent]=useState("");
  const [subject,setSubject]=useState("");
  const [state,action,pending]=useActionState(saveOffering,initial);
  const [selectionState,selectionAction,selectionPending]=useActionState(saveSelection,initial);
  const [importState,importAction,importPending]=useActionState(importCatalog,initial);
  const [pathwayState,pathwayAction,pathwayPending]=useActionState(savePathway,initial);
  const scoped=(items:Scoped[])=>items.filter(i=>i.campusId===campus);
  const visible=offerings.filter(o=>o.campusId===campus&&o.classArmId===arm&&o.termId===term);
  const selected=enrollments.find(e=>e.id===student&&e.campusId===campus&&e.classArmId===arm);
  return <section className="card mt-5 space-y-4 p-5">
    <h2 className="text-lg font-black">Curriculum management</h2>
    <p className="text-sm text-[#747c87]">Configure existing campus subjects for the current term. Offerings do not automatically enroll students.</p>
    <div className="grid gap-3 sm:grid-cols-3">
      <label>Campus<select className={field} value={campus} onChange={e=>{setCampus(e.target.value);setArm("");setTerm("");setStudent("");setSubject("");}}><Options items={campuses}/></select></label>
      <label>Class<select className={field} value={arm} onChange={e=>{setArm(e.target.value);setStudent("");}}><Options items={scoped(arms)}/></select></label>
      <label>Term<select className={field} value={term} onChange={e=>setTerm(e.target.value)}><Options items={scoped(terms)}/></select></label>
    </div>
    {campus&&<form action={importAction} className="space-y-2 rounded-xl border p-3">
      <input type="hidden" name="campusId" value={campus}/>
      <p className="text-sm">Register the approved subject catalog for this campus. This does not assign subjects to classes or teachers.</p>
      <button className="button" disabled={importPending} type="submit">{importPending?"Registering…":"Register Petra subject catalog"}</button><p role="status">{importState.message}</p>
    </form>}
    {campus&&arm&&term&&<>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="campusId" value={campus}/><input type="hidden" name="classArmId" value={arm}/><input type="hidden" name="termId" value={term}/>
        <label>Subject<select required className={field} name="subjectId" value={subject} onChange={e=>setSubject(e.target.value)}><Options items={scoped(subjects).filter(s=>!visible.some(o=>o.displayName===s.name))}/></select></label>
        <label>Report display name<input key={subject} className={field} name="displayName" required maxLength={120} defaultValue={subjects.find(s=>s.id===subject&&s.campusId===campus)?.name??""}/></label>
        <label>Report group (optional)<input className={field} name="groupName" maxLength={120}/></label>
        <label>Display order<input className={field} type="number" name="sortOrder" min={0} max={1000} defaultValue={0} required/></label>
        <label>Pathway<select className={field} name="pathway"><option value="">All pathways</option><option value="SCIENCE">Science</option><option value="ARTS">Arts</option><option value="COMMERCIAL">Commercial</option></select></label>
        <label className="self-center"><input type="checkbox" name="isRequired"/> Compulsory subject</label>
        <button className="button" disabled={pending} type="submit">{pending?"Saving…":"Add class subject"}</button><p role="status">{state.message}</p>
      </form>
      <div className="space-y-2"><h3 className="font-bold">Configured subjects</h3>{visible.map(o=><p key={o.id} className="rounded-lg border p-2">{o.displayName} · {o.groupName??"Ungrouped"} · {o.pathway??"All pathways"} · {o.isRequired?"Compulsory":"Optional"}</p>)}{!visible.length&&<p>No subjects configured for this class and term.</p>}</div>
      {selected&&<form action={pathwayAction} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="campusId" value={campus}/><input type="hidden" name="enrollmentId" value={selected.id}/>
        <label>Senior student pathway<select key={selected.id+selected.pathway} required className={field} name="pathway" defaultValue={selected.pathway??""}><option value="">Select…</option><option value="SCIENCE">Science</option><option value="ARTS">Arts</option><option value="COMMERCIAL">Commercial</option></select></label>
        <button className="button" disabled={pathwayPending} type="submit">{pathwayPending?"Saving…":"Save senior pathway"}</button><p role="status">{pathwayState.message}</p>
      </form>}
      <form action={selectionAction} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="campusId" value={campus}/>
        <label>Student<select required name="enrollmentId" className={field} value={student} onChange={e=>setStudent(e.target.value)}><Options items={enrollments.filter(e=>e.campusId===campus&&e.classArmId===arm)}/></select></label>
        <label>Available subject<select key={student+term} required name="offeringId" className={field}><Options items={selected?visible.filter(o=>!o.pathway||o.pathway===selected.pathway).map(o=>({id:o.id,name:o.displayName})):[]}/></select></label>
        <button className="button" disabled={selectionPending||!selected} type="submit">{selectionPending?"Saving…":"Assign student subject"}</button><p role="status">{selectionState.message}</p>
      </form>
    </>}
  </section>;
}
