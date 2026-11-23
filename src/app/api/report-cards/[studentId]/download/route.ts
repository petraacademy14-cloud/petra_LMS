import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/dal";
import { loadPublishedReport } from "@/lib/report-cards/report-data";
import { reportDownload } from "@/lib/report-cards/download";
export async function GET(request:Request,context:{params:Promise<{studentId:string}>}){
  const viewer=await requirePermission("results.read");
  const {studentId}=await context.params;
  const termId=new URL(request.url).searchParams.get("termId");
  if(!termId)return new NextResponse("Term is required.",{status:400});
  const report=await loadPublishedReport({
    studentId,termId,schoolId:viewer.membership.schoolId,
    ...(viewer.membership.role==="OWNER"?{}:{campusId:viewer.membership.campusId??"__none__"}),
  });
  if(!report)return new NextResponse("Published report card not found.",{status:404});
  return reportDownload(report);
}
