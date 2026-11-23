import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { PublishedReport } from "./report-data";

const RED=rgb(0.89,0.133,0.153), DARK=rgb(0.13,0.16,0.2), MUTED=rgb(0.42,0.44,0.48);
const W=595.28,H=841.89;
function ascii(s:string){return s.replace(/[^\x20-\x7E]/g,"-");}
function fit(text:string,font:PDFFont,size:number,maxWidth:number){
  let s=ascii(text);
  while(s.length>1&&font.widthOfTextAtSize(s,size)>maxWidth)s=s.slice(0,-2);
  return s.length<text.length?s+"…".replace("…","."):s;
}
export async function renderReportPdf(report:PublishedReport){
  const pdf=await PDFDocument.create();
  const normal=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  let logo:Awaited<ReturnType<typeof pdf.embedJpg>>|null=null;
  try{const bytes=await readFile(path.join(process.cwd(),"public/petra-academy-logo.jpg"));logo=await pdf.embedJpg(bytes);}catch{/* Continue with text heading if logo is missing. */}
  let page:PDFPage;
  let y=0;
  const text=(value:string,x:number,y0:number,size=9,strong=false,max=480)=>{
    page.drawText(fit(value,strong?bold:normal,size,max),{x,y:y0,size,font:strong?bold:normal,color:DARK});
  };
  const line=(y0:number)=>page.drawLine({start:{x:35,y:y0},end:{x:560,y:y0},thickness:.6,color:rgb(.82,.83,.85)});
  const header=(continued=false)=>{
    page=pdf.addPage([W,H]);
    page.drawRectangle({x:0,y:H-14,width:W,height:14,color:RED});
    if(logo)page.drawImage(logo,{x:35,y:745,width:68,height:68});
    text(report.schoolName,logo?113:35,790,18,true,440);
    text("Firm Foundation for Building Excellent Leaders",logo?113:35,774,9,false,420);
    text(report.section==="NURSERY"?"NURSERY TERMLY REPORT":report.section==="ELEMENTARY"?"ELEMENTARY TERMLY REPORT":report.section==="JUNIOR"?"JUNIOR SECONDARY TERMLY REPORT":"SENIOR SECONDARY TERMLY REPORT",35,727,14,true);
    text(report.campusName+"   |   "+report.termName+"   |   "+report.sessionName,35,706,10,false);
    line(695);
    text("STUDENT: "+report.studentName,35,676,10,true,300);
    text("REG. NO: "+report.admissionNumber,355,676,9,false,200);
    text("CLASS: "+report.className,35,657,9,true);
    text("TERM: "+report.termName,355,657,9);
    if(!continued){text("CAT 1 + CAT 2 + EXAM = TOTAL (20 + 20 + 60 = 100)",35,637,8);}
    y=610;
    page.drawRectangle({x:35,y:y-7,width:525,height:23,color:RED});
    const heads=[["Subject",40],["CAT1",256],["CAT2",301],["Exam",347],["Total",391],["Grade",438],["Remark",480]];
    heads.forEach(([t,x])=>page.drawText(String(t),{x:Number(x),y:y+1,size:8,font:bold,color:rgb(1,1,1)}));
    y-=18;
  };
  header();
  let lastGroup:string|null=null;
  const rowHeight=18;
  for(const row of report.rows){
    const willGroup=Boolean(row.group&&row.group!==lastGroup);
    if(y-(willGroup?18:0)-rowHeight<145){header(true);lastGroup=null;}
    if(row.group&&row.group!==lastGroup){
      page.drawRectangle({x:35,y:y-10,width:525,height:17,color:rgb(.94,.94,.95)});
      text(row.group,40,y-4,8,true,350);
      y-=18;
    }
    lastGroup=row.group;
    const num=(n:number|null)=>n===null?"-":String(n);
    text(row.subject,40,y,8,false,206);
    text(num(row.cat1),260,y,8);
    text(num(row.cat2),306,y,8);
    text(num(row.exam),351,y,8);
    text(num(row.total),393,y,8,true);
    text(row.grade,443,y,8,true);
    text(row.remark,482,y,8,false,75);
    line(y-6);y-=rowHeight;
  }
  if(y<225){header(true);}
  y-=10;
  text("TOTAL: "+report.rows.filter(r=>r.total!==null).reduce((a,r)=>a+r.total!,0).toFixed(2),35,y,10,true);
  text("AVERAGE: "+(report.average===null?"-":report.average.toFixed(2)+"%"),256,y,10,true);
  y-=29;
  text("ATTENDANCE  Opened: "+report.attendance.total+"   Present: "+report.attendance.present+"   Absent: "+report.attendance.absent,35,y,9);
  y-=30;
  for(const caption of ["Conduct: _______________________________    Positive traits: _______________________________",
    "Negative traits: _________________________   Extra-curricular: __________________________",
    "Teacher's comment: ________________________________________________________________",
    "Teacher / Signature: ___________________________   Date: __________________________",
    "Principal's comment: ______________________________________________________________",
    "Principal / Signature: __________________________   Date: __________________________"]){
      if(y<48){header(true);y=565;}
      text(caption,35,y,9,false,525);y-=24;
  }
  for(const [index,p] of pdf.getPages().entries()){
    p.drawText("Petra Academy  |  Published results only  |  Page "+(index+1)+" of "+pdf.getPageCount(),{x:35,y:25,size:8,font:normal,color:MUTED});
  }
  return Buffer.from(await pdf.save());
}
