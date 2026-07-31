import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireApplicant } from "@/lib/applicant-auth";
import { db } from "@/lib/db";

type LetterRow = {
  applicationNumber: string;
  studentFirstName: string;
  studentMiddleName: string | null;
  studentLastName: string;
  campusName: string;
  className: string;
  applicantMessage: string | null;
  offerExpiresAt: Date;
  offerResponse: string;
  createdAt: Date;
};

function wrapText(text: string, maxCharacters = 82) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxCharacters && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const viewer = await requireApplicant();
  const { applicationId } = await params;
  if (applicationId !== viewer.applicationId) {
    return new Response("Not found", { status: 404 });
  }

  const [letter] = await db.$queryRaw<LetterRow[]>`
    SELECT a."applicationNumber", a."studentFirstName", a."studentMiddleName",
      a."studentLastName", c."name" AS "campusName", l."name" AS "className",
      d."applicantMessage", d."offerExpiresAt", d."offerResponse"::text AS "offerResponse",
      d."createdAt"
    FROM "admission_decisions" d
    JOIN "admission_applications" a ON a."id" = d."applicationId"
    JOIN "campuses" c ON c."id" = d."campusId"
    JOIN "class_levels" l ON l."id" = a."classLevelId"
    WHERE d."applicationId" = ${applicationId}
      AND d."outcome" = 'ACCEPTED'
      AND d."offerResponse" IN ('PENDING', 'ACCEPTED')
    LIMIT 1
  `;
  if (!letter) return new Response("Admission letter not available", { status: 404 });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const red = rgb(0.84, 0.1, 0.13);
  const dark = rgb(0.12, 0.14, 0.17);
  const muted = rgb(0.38, 0.42, 0.47);

  page.drawRectangle({ x: 0, y: 812, width: 595, height: 30, color: red });
  page.drawText("PETRA ACADEMY", { x: 48, y: 770, size: 24, font: bold, color: dark });
  page.drawText("FIRM FOUNDATION", { x: 48, y: 750, size: 9, font: bold, color: red });
  page.drawText("PROVISIONAL OFFER OF ADMISSION", {
    x: 48,
    y: 704,
    size: 15,
    font: bold,
    color: dark,
  });
  page.drawText(letter.applicationNumber, {
    x: 390,
    y: 704,
    size: 10,
    font: bold,
    color: red,
  });
  page.drawLine({
    start: { x: 48, y: 690 },
    end: { x: 547, y: 690 },
    thickness: 1,
    color: rgb(0.85, 0.87, 0.89),
  });

  const fullName = [
    letter.studentFirstName,
    letter.studentMiddleName,
    letter.studentLastName,
  ]
    .filter(Boolean)
    .join(" ");
  let y = 650;
  page.drawText(`Dear Parent/Guardian of ${fullName},`, {
    x: 48,
    y,
    size: 11,
    font: regular,
    color: dark,
  });
  y -= 36;

  const opening = `Petra Academy is pleased to offer ${fullName} admission into ${letter.className} at the ${letter.campusName} campus, subject to acceptance of this offer and completion of the school enrolment requirements.`;
  for (const line of wrapText(opening)) {
    page.drawText(line, { x: 48, y, size: 10.5, font: regular, color: dark });
    y -= 17;
  }
  y -= 18;

  if (letter.applicantMessage) {
    page.drawText("MESSAGE FROM ADMISSIONS", { x: 48, y, size: 8, font: bold, color: red });
    y -= 20;
    for (const line of wrapText(letter.applicantMessage)) {
      if (y < 185) break;
      page.drawText(line, { x: 48, y, size: 10, font: regular, color: dark });
      y -= 16;
    }
    y -= 18;
  }

  const details = [
    ["Applicant", fullName],
    ["Campus", letter.campusName],
    ["Class", letter.className],
    ["Application number", letter.applicationNumber],
    ["Offer issued", letter.createdAt.toLocaleDateString("en-NG")],
    ["Accept before", letter.offerExpiresAt.toLocaleString("en-NG")],
    ["Current response", letter.offerResponse === "ACCEPTED" ? "Accepted" : "Awaiting response"],
  ];
  for (const [label, value] of details) {
    page.drawText(label.toUpperCase(), { x: 48, y, size: 7.5, font: bold, color: muted });
    page.drawText(value, { x: 185, y: y - 1, size: 10, font: regular, color: dark });
    y -= 29;
  }

  page.drawText(
    "Please sign in to the Petra applicant portal to accept or decline this offer before the deadline.",
    { x: 48, y: 105, size: 9, font: bold, color: red, maxWidth: 490 },
  );
  page.drawText(
    "This letter is generated from the Petra LMS admission record and is valid only for the application number shown above.",
    { x: 48, y: 66, size: 8, font: regular, color: muted, maxWidth: 490 },
  );

  const bytes = await pdf.save();
  const safeName = letter.applicationNumber.replaceAll("/", "-");
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}-admission-letter.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
