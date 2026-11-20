"use server";
import { revalidatePath } from "next/cache";
import { createCurriculumOffering, addStudentSubjectSelection } from "@/lib/curriculum/service";
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
