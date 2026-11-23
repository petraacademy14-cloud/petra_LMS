"use server";
import { revalidatePath } from "next/cache";
import { createCurriculumOffering, addStudentSubjectSelection, registerCampusCatalog, setStudentPathway, bulkConfigureClassSubjects } from "@/lib/curriculum/service";
import type { ActionState } from "./foundation";

export async function saveOffering(_state: ActionState, form: FormData): Promise<ActionState> {
  try {
    await createCurriculumOffering({
      campusId: form.get("campusId"), termId: form.get("termId"), classArmId: form.get("classArmId"),
      subjectId: form.get("subjectId"), displayName: form.get("displayName"),
      groupName: form.get("groupName") || null, sortOrder: Number(form.get("sortOrder")),
      pathway: form.get("pathway") || null, isRequired: form.get("isRequired") === "on",
    });
    revalidatePath("/academics");
    return {status:"success",message:"Subject offering saved."};
  } catch { return {status:"error",message:"Could not save. Check campus, class, term, subject availability and duplicate offerings."}; }
}

export async function saveSelection(_state: ActionState, form: FormData): Promise<ActionState> {
  try {
    await addStudentSubjectSelection({campusId:form.get("campusId"),enrollmentId:form.get("enrollmentId"),offeringId:form.get("offeringId")});
    revalidatePath("/academics");
    return {status:"success",message:"Student subject assigned."};
  } catch { return {status:"error",message:"Could not assign. Check the student's class, campus and pathway."}; }
}

export async function importCatalog(_state:ActionState,form:FormData):Promise<ActionState>{
  try {
    const result=await registerCampusCatalog({campusId:form.get("campusId")});
    revalidatePath("/academics");
    return {status:"success",message:`Created ${result.created}; enabled ${result.enabled}; skipped ${result.skipped} ambiguous or inactive subjects for review.`};
  }catch{return {status:"error",message:"Catalog registration failed. No partial changes were saved."};}
}
export async function savePathway(_state:ActionState,form:FormData):Promise<ActionState>{
  try{
    await setStudentPathway({campusId:form.get("campusId"),enrollmentId:form.get("enrollmentId"),pathway:form.get("pathway")});
    revalidatePath("/academics");
    return {status:"success",message:"Student pathway saved."};
  }catch{return {status:"error",message:"Could not save pathway. Check senior class eligibility and existing subject selections."};}
}

export async function bulkConfigureSubjects(_state:ActionState,form:FormData):Promise<ActionState>{
  try {
    const result=await bulkConfigureClassSubjects({
      campusId:form.get("campusId"),termId:form.get("termId"),
      classArmId:form.get("classArmId"),section:form.get("section"),
    });
    revalidatePath("/academics");
    return {status:"success",message:`Added ${result.added} subjects; ${result.alreadyConfigured} already configured. Existing assignments were preserved.`};
  } catch {
    return {status:"error",message:"Bulk configuration was not saved. Verify class section, current term and register the full campus subject catalog first."};
  }
}
