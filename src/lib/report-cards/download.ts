import { NextResponse } from "next/server";
import type { PublishedReport } from "./report-data";
import { renderReportPdf } from "./report-pdf";
export async function reportDownload(report:PublishedReport){
  const bytes=await renderReportPdf(report);
  const filename=report.admissionNumber.replace(/[^A-Za-z0-9-]+/g,"-")+"-"+report.termName.replace(/[^A-Za-z0-9-]+/g,"-")+"-report.pdf";
  return new NextResponse(bytes,{headers:{
    "Content-Type":"application/pdf",
    "Content-Disposition":'attachment; filename="'+filename+'"',
    "Cache-Control":"private, no-store",
  }});
}
