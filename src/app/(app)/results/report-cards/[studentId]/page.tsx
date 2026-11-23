import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AcademicsNav } from "@/components/academics-nav";
import { ReportCardActions } from "@/components/report-card-actions";
import { requirePermission } from "@/lib/dal";
import { loadPublishedReport } from "@/lib/report-cards/report-data";

export const metadata:Metadata={title:"Student report card"};

export default async function StudentReportCardPage({
  params,searchParams,
}:{
  params:Promise<{studentId:string}>;
  searchParams:Promise<{termId?:string}>;
}) {
  const viewer=await requirePermission("results.read");
  const [{studentId},query]=await Promise.all([params,searchParams]);
  if(!query.termId)notFound();
  const report=await loadPublishedReport({
    schoolId:viewer.membership.schoolId,studentId,termId:query.termId,
    ...(viewer.membership.role==="OWNER"?{}:{campusId:viewer.membership.campusId??"__none__"}),
  });
  if(!report)notFound();
  const sectionTitle=report.section==="NURSERY"?"Nursery Termly Report":
    report.section==="ELEMENTARY"?"Elementary Termly Report":
    report.section==="JUNIOR"?"Junior Secondary Termly Report":"Senior Secondary Termly Report";
  return <div>
    <div className="print:hidden"><AcademicsNav/></div>
    <article className="card mx-auto mt-6 max-w-5xl p-5 print:mt-0 print:max-w-none print:border-0 print:p-0 print:shadow-none">
      <header className="border-b-2 border-[#E32227] pb-4">
        <div className="flex items-center gap-4">
          <Image src="/petra-academy-logo.jpg" alt="Petra Academy crest" width={88} height={88} className="h-20 w-20 object-contain"/>
          <div>
            <h1 className="text-2xl font-black text-[#E32227]">{report.schoolName}</h1>
            <p className="text-xs font-bold">Firm Foundation for Building Excellent Leaders</p>
            <p className="text-sm">{report.campusName}</p>
          </div>
        </div>
        <h2 className="mt-4 text-center text-lg font-black uppercase">{sectionTitle}</h2>
        <p className="text-center text-sm">{report.sessionName} · {report.termName}</p>
        <div className="mt-3 print:hidden"><ReportCardActions studentId={studentId} termId={query.termId}/></div>
      </header>
      <section className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <p><strong>Student:</strong> {report.studentName}</p>
        <p><strong>Registration No:</strong> {report.admissionNumber}</p>
        <p><strong>Class:</strong> {report.className}</p>
        <p><strong>Term:</strong> {report.termName}</p>
      </section>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-[#E32227] text-white">
            <tr>{["Subject","CAT 1 (20)","CAT 2 (20)","Exam (60)","Total (100)","Grade","Teacher's remark"].map(h=><th className="border border-[#d2d2d2] p-2 text-left" key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>{report.rows.map((r,index)=><tr key={r.subject+index} className="break-inside-avoid">
            <td className="border p-2">{r.group&&<span className="block text-[10px] text-[#666]">{r.group}</span>}<strong>{r.subject}</strong></td>
            {[r.cat1,r.cat2,r.exam,r.total].map((n,i)=><td className="border p-2 text-center" key={i}>{n??"—"}</td>)}
            <td className="border p-2 text-center">{r.grade}</td>
            <td className="border p-2 text-center">{r.classHighest??"—"}</td><td className="border p-2 text-center">{r.classLowest??"—"}</td><td className="border p-2">{r.remark}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <section className="mt-4 flex flex-wrap gap-7 text-sm">
        <p><strong>Average:</strong> {report.average===null?"—":report.average.toFixed(2)+"%"}</p>
        <p><strong>School opened:</strong> {report.attendance.total}</p>
        <p><strong>Present:</strong> {report.attendance.present}</p>
        <p><strong>Absent:</strong> {report.attendance.absent}</p>
      </section>
      <section className="mt-5 grid gap-x-8 gap-y-5 border-t pt-5 text-sm sm:grid-cols-2">
        <p><strong>Conduct:</strong> _______________________________</p>
        <p><strong>Positive traits:</strong> ________________________</p>
        <p><strong>Negative traits:</strong> ________________________</p>
        <p><strong>Extra-curricular activities:</strong> ______________</p>
        <p><strong>Teacher&apos;s comment:</strong> _____________________</p>
        <p><strong>Teacher&apos;s signature:</strong> ____________________</p>
        <p><strong>Principal&apos;s comment:</strong> ___________________</p>
        <p><strong>Principal&apos;s signature:</strong> ____________________</p>
      </section>
      <p className="mt-6 text-xs text-[#69707a]">Only published or locked subject results are shown. Fields without approved data are left blank for completion.</p>
    </article>
  </div>;
}
