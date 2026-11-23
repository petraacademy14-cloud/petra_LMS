import { NextResponse } from "next/server";
import { getPortalViewer } from "@/lib/portal-auth";
import { loadPublishedReport } from "@/lib/report-cards/report-data";
import { reportDownload } from "@/lib/report-cards/download";
export async function GET(request:Request,context:{params:Promise<{studentId:string}>}){
  const viewer=await getPortalViewer();
  if(!viewer||viewer.role!=="STUDENT"||!viewer.studentId)return new NextResponse("Unauthorized",{status:401});
  const {studentId}=await context.params;
  if(viewer.studentId!==studentId)return new NextResponse("Not found",{status:404});
  const termId=new URL(request.url).searchParams.get("termId");
  if(!termId)return new NextResponse("Term is required.",{status:400});
  const report=await loadPublishedReport({studentId,termId,schoolId:viewer.schoolId,releasedAttendanceOnly:true});
  if(!report)return new NextResponse("Published report card not found.",{status:404});
  return reportDownload(report);
}
