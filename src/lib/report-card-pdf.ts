import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ReportCardData } from "@/lib/report-card-data";

// Standard fonts support Latin text. Replace unsupported characters rather than crash a download.
export function pdfText(value: string) {
  return value.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/[^\x20-\x7e\xa0-\xff\n\r]/g, "?");
}
export function wrapPdfText(value: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const para of pdfText(value).split(/\r?\n/)) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
      if (line) lines.push(line);
      line = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(line + char, size) > width && line) { lines.push(line); line = ""; }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}
const num = (n: number | null) => n === null ? "" : Number(n.toFixed(2)).toString();
export async function buildReportCardPdf(data: ReportCardData) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${data.studentName} - ${data.term} ${data.session}`);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(await readFile(path.join(process.cwd(), "public/petra-report-logo.png")));
  const red = rgb(0.89, 0.13, 0.15), black = rgb(0, 0, 0), grey = rgb(0.75, 0.75, 0.75);
  const nursery = data.format === "NURSERY";
  const left = 30, width = 535;
  let page = pdf.addPage([595.28, 841.89]);
  let y = 805;
  const text = (value: string, x: number, baseline: number, size = 9, strong = false, color = black) => page.drawText(pdfText(value), { x, y: baseline, size, font: strong ? bold : regular, color });
  const centered = (value: string, baseline: number, size = 12, color = black) => {
    size = Math.min(size, size * width / Math.max(width, bold.widthOfTextAtSize(pdfText(value), size)));
    text(value, (595.28 - bold.widthOfTextAtSize(pdfText(value), size)) / 2, baseline, size, true, color);
  };
  function newPage() {
    page = pdf.addPage([595.28, 841.89]); y = 800;
    text(`${data.studentName} | ${data.admissionNumber}`, left, y, 10, true);
    y -= 17; text(`${data.className} | ${data.term} | ${data.session} (continued)`, left, y); y -= 25;
  }
  function ensure(height: number) { if (y - height < 45) newPage(); }
  const secondaryClass = /secondary|college|\bss[123]?\b|grade (?:[7-9]|1[0-2])/i.test(data.className) || data.details.format === "SECONDARY";
  const heading = data.details.schoolHeading || (nursery ? `Petra Academy ${data.city}` : secondaryClass ? "Petra College" : data.schoolName);
  const address = data.details.schoolAddress || (/awka/i.test(data.city) ? nursery ? "#5 Club Road, Iyiagu Estate, Awka, Anambra State." : "#5 Abakaliki Street, Iyiagu Estate, Awka, Anambra State" : `${data.campusName}, ${data.city}`);
  if (nursery) {
    page.drawImage(logo, { x: 263, y: 740, width: 70, height: 70 });
    centered(heading, 719, 18);
    centered('"Firm Foundation for Building Excellent Leaders"', 701, 11);
    centered(address, 685, 9);
    centered("Nursery Termly Report", 658, 15);
    y = 632;
  } else {
    page.drawImage(logo, { x: 30, y: 741, width: 78, height: 78 });
    text(heading, 127, 788, Math.min(29, 29 * 438 / Math.max(438, bold.widthOfTextAtSize(pdfText(heading), 29))), true, red);
    text(address, 127, 769, Math.min(8, 8 * 438 / Math.max(438, bold.widthOfTextAtSize(pdfText(address), 8))), true);
    text("(A Leadership School)", 127, 752, 11, true);
    text('"Firm Foundation for building excellent leaders"', 127, 735, 10, true);
    y = 710;
    page.drawRectangle({ x: left, y: y - 6, width, height: 24, borderColor: black, borderWidth: .7 });
    centered(`TERM REPORT SHEET    ${data.term}    ${data.session}`, y + 2, 11, red); y -= 30;
  }
  function field(label: string, value: string, x: number, span: number) {
    const lines = wrapPdfText(`${label}: ${value || "________________"}`, regular, 9, span);
    lines.forEach((line, i) => text(line, x, y - i * 12, 9));
    return lines.length * 12;
  }
  y -= field(nursery ? "Name of pupil" : "Student name", data.studentName, left, width) + 5;
  y -= Math.max(field(nursery ? "Registration number" : "Admission number", data.admissionNumber, left, 275), field(nursery ? "Class" : "Form", data.className, 320, 245)) + 5;
  const date = data.details.nextTermBegins ? new Date(data.details.nextTermBegins).toLocaleDateString("en-GB", { timeZone: "UTC" }) : "";
  y -= Math.max(field("Next term begins", date, left, 275), field("Session / Term", `${data.session} / ${data.term}`, 320, 245)) + 5;
  if (nursery) y -= Math.max(field("Number in class", String(data.classCount), left, 275), field("Years", data.age === null ? "" : String(data.age), 320, 245)) + 5;
  y -= 10;
  const widths = nursery ? [53, 150, 40, 40, 43, 43, 46, 46, 95] : [155, 43, 43, 47, 44, 36, 44, 44, 79];
  // Scale both templates to the printable page width.
  const scale = width / widths.reduce((a, b) => a + b, 0);
  const columns = widths.map((w) => w * scale);
  const headers = nursery ? ["Group", "Subject", "CAT 1\n20%", "CAT 2\n20%", "Exam\n60%", "Total\n100%", "Class\nhighest", "Class\nlowest", "Teacher's\nremarks"] : ["Subject", "First CAT\n20%", "Second CAT\n20%", "Exam\n60%", "Total\n100%", "Grade", "Highest\nscore", "Lowest\nscore", "Remark"];
  function tableRow(cells: string[], header = false) {
    const lines = cells.map((v, i) => wrapPdfText(v, header ? bold : regular, 8, columns[i]! - 8));
    const height = Math.max(21, Math.max(...lines.map((l) => l.length)) * 10 + 8);
    let x = left;
    for (let i = 0; i < cells.length; i++) {
      page.drawRectangle({ x, y: y - height, width: columns[i]!, height, borderColor: grey, borderWidth: .5 });
      lines[i]!.forEach((line, j) => text(line, x + 4, y - 12 - j * 10, 8, header, header && !nursery ? red : black));
      x += columns[i]!;
    }
    y -= height;
  }
  tableRow(headers, true);
  const group = (subject: string) => /lexis|reading|writing|language|literacy/i.test(subject) ? "Literacy" : /math|science|health/i.test(subject) ? "Science" : /world|relig|cultur|art/i.test(subject) ? "Arts" : "Others";
  for (const row of data.rows) {
    const cells = nursery ? [group(row.subject), row.subject, num(row.cat1), num(row.cat2), num(row.exam), num(row.total), num(row.highest), num(row.lowest), row.remark] : [row.subject, num(row.cat1), num(row.cat2), num(row.exam), num(row.total), row.grade, num(row.highest), num(row.lowest), row.remark];
    const needed = Math.max(21, Math.max(...cells.map((v, i) => wrapPdfText(v, regular, 8, columns[i]! - 8).length)) * 10 + 8);
    if (y - needed < 55) { newPage(); tableRow(headers, true); }
    tableRow(cells);
  }
  ensure(35); y -= 18; text(`TOTAL: ${num(data.total)}`, left, y, 10, true, nursery ? black : red);
  text(`AVERAGE: ${num(data.average)}%`, 390, y, 10, true, nursery ? black : red); y -= 24;
  function paragraph(label: string, value: string) {
    const lines = wrapPdfText(value || "____________________________________________________________", regular, 9, width - 12);
    ensure(27); text(label, left, y, 9, true, nursery ? black : red); y -= 13;
    for (const line of lines) { ensure(16); text(line, left + 5, y); y -= 11; }
    y -= 6;
  }
  if (nursery) {
    paragraph("Conduct", data.details.conduct);
    paragraph("Negative traits", data.details.negativeTraits);
    paragraph("Positive traits", data.details.positiveTraits);
  }
  ensure(25); text(`School opened: ${data.attendance.total} days    Present: ${data.attendance.present + data.attendance.late} days    Attendance: ${data.attendance.attendanceRate}%`, left, y, 9); y -= 24;
  if (nursery) paragraph("Extra curricular activities", data.details.activities);
  paragraph("Teacher's comment", data.details.teacherComment);
  paragraph("Name of teacher / Signature", `${data.details.teacherName}    Signature: __________________    Date: __________`);
  paragraph("Principal's comment", data.details.principalComment);
  paragraph("Name of principal / Signature", `${data.details.principalName}    Signature: __________________    Date: __________`);
  pdf.getPages().forEach((p, i) => p.drawText(`Published subjects: ${data.rows.length} | Page ${i + 1} of ${pdf.getPageCount()}`, { x: left, y: 23, size: 7, font: regular, color: rgb(.4, .4, .4) }));
  return pdf.save();
}
