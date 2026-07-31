import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getApplicantViewer } from "@/lib/applicant-auth";
import { ensureApplicantExamRegistration } from "@/lib/applicant-exam";

export async function GET() {
  const viewer = await getApplicantViewer();
  if (!viewer) return new Response("Unauthorized", { status: 401 });
  const registration = await ensureApplicantExamRegistration(viewer);
  if (!registration || registration.mode !== "ONSITE") {
    return new Response("Examination slip not available", { status: 404 });
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const red = rgb(0.72, 0.07, 0.09);
  const dark = rgb(0.12, 0.14, 0.17);
  const muted = rgb(0.38, 0.42, 0.47);

  page.drawRectangle({ x: 0, y: 810, width: 595, height: 32, color: red });
  page.drawText("PETRA ACADEMY", { x: 48, y: 770, size: 21, font: bold, color: dark });
  page.drawText("ENTRANCE EXAMINATION SLIP", { x: 48, y: 747, size: 10, font: bold, color: red });
  page.drawText(registration.candidateNumber, { x: 350, y: 768, size: 15, font: bold, color: red });
  page.drawLine({ start: { x: 48, y: 722 }, end: { x: 547, y: 722 }, thickness: 1, color: rgb(0.84, 0.86, 0.89) });

  const rows = [
    ["Application number", viewer.applicationNumber],
    ["Candidate number", registration.candidateNumber],
    ["Seat number", registration.seatNumber ?? "To be assigned"],
    ["Campus", registration.campusName],
    ["Class", registration.className],
    ["Examination", registration.title],
    ["Date and time", registration.scheduledAt?.toLocaleString("en-NG") ?? "Pending"],
    ["Venue", registration.venue ?? "Pending"],
  ];
  let y = 680;
  for (const [label, value] of rows) {
    page.drawText(label.toUpperCase(), { x: 48, y, size: 8, font: bold, color: muted });
    page.drawText(value, { x: 190, y: y - 1, size: 11, font: label === "Candidate number" ? bold : regular, color: label === "Candidate number" ? red : dark, maxWidth: 350 });
    y -= 43;
  }

  page.drawRectangle({ x: 48, y: 180, width: 499, height: 155, borderWidth: 1, borderColor: rgb(0.84, 0.86, 0.89) });
  page.drawText("CANDIDATE INSTRUCTIONS", { x: 65, y: 305, size: 10, font: bold, color: red });
  const instructions = [
    "Present this slip at the examination venue.",
    "Arrive at least 30 minutes before the scheduled time.",
    "Bring an accepted identification document and writing materials.",
    "Follow all instructions issued by Petra Academy invigilators.",
  ];
  instructions.forEach((instruction, index) => {
    page.drawText(`${index + 1}. ${instruction}`, { x: 65, y: 278 - index * 24, size: 9.5, font: regular, color: dark, maxWidth: 455 });
  });
  page.drawText("Generated securely from the Petra Academy applicant portal.", { x: 48, y: 55, size: 8, font: regular, color: muted });

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${registration.candidateNumber}-exam-slip.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
