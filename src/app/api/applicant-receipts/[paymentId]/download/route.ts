import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getApplicantViewer } from "@/lib/applicant-auth";
import { db } from "@/lib/db";
import { entranceFeeLabel, type EntranceFeeKind } from "@/lib/applicant-finance";

type ReceiptRow = {
  id: string;
  receiptNumber: string;
  amount: unknown;
  method: string;
  reference: string | null;
  paidAt: Date;
  status: string;
  kind: EntranceFeeKind;
  applicationNumber: string;
  studentFirstName: string | null;
  studentLastName: string | null;
  campusName: string;
  className: string;
  schoolName: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const viewer = await getApplicantViewer();
  if (!viewer) return new Response("Unauthorized", { status: 401 });
  const { paymentId } = await params;
  const [receipt] = await db.$queryRaw<ReceiptRow[]>`
    SELECT p."id", p."receiptNumber", p."amount", p."method"::text AS "method",
      p."reference", p."paidAt", p."status"::text AS "status", ch."kind"::text AS "kind",
      a."applicationNumber", a."studentFirstName", a."studentLastName",
      c."name" AS "campusName", l."name" AS "className", s."name" AS "schoolName"
    FROM "applicant_payments" p
    JOIN "applicant_charges" ch ON ch."id"=p."chargeId"
    JOIN "admission_applications" a ON a."id"=p."applicationId"
    JOIN "campuses" c ON c."id"=p."campusId"
    JOIN "class_levels" l ON l."id"=a."classLevelId"
    JOIN "schools" s ON s."id"=p."schoolId"
    WHERE p."id"=${paymentId} AND p."applicationId"=${viewer.applicationId}
      AND p."receiptNumber" IS NOT NULL AND p."status" IN ('VERIFIED','REVERSED')
    LIMIT 1
  `;
  if (!receipt) return new Response("Not found", { status: 404 });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const red = rgb(0.65, 0.055, 0.07);
  const dark = rgb(0.12, 0.14, 0.17);
  const muted = rgb(0.4, 0.44, 0.49);

  page.drawRectangle({ x: 0, y: 815, width: 595, height: 27, color: red });
  page.drawText(receipt.schoolName, { x: 48, y: 770, size: 22, font: bold, color: dark });
  page.drawText(`${receipt.campusName} CAMPUS | ENTRANCE PAYMENT RECEIPT`, {
    x: 48,
    y: 746,
    size: 10,
    font: bold,
    color: red,
  });
  page.drawText(receipt.receiptNumber, { x: 365, y: 770, size: 12, font: bold, color: red });
  page.drawLine({ start: { x: 48, y: 720 }, end: { x: 547, y: 720 }, thickness: 1, color: rgb(0.85, 0.87, 0.89) });

  const amount = Number(receipt.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 });
  const rows = [
    ["Applicant", `${receipt.studentFirstName ?? ""} ${receipt.studentLastName ?? ""}`.trim()],
    ["Application number", receipt.applicationNumber],
    ["Class", receipt.className],
    ["Fee", entranceFeeLabel(receipt.kind)],
    ["Payment date", receipt.paidAt.toLocaleString("en-NG")],
    ["Payment method", receipt.method],
    ["Reference", receipt.reference ?? "-"],
    ["Amount", `NGN ${amount}`],
    ["Status", receipt.status],
  ];
  let y = 680;
  for (const [label, value] of rows) {
    page.drawText(label.toUpperCase(), { x: 48, y, size: 8, font: bold, color: muted });
    page.drawText(value, { x: 190, y: y - 1, size: 11, font: label === "Amount" ? bold : regular, color: label === "Amount" ? red : dark });
    y -= 42;
  }
  page.drawText(`Generated from Petra Academy's append-only applicant payment ledger.`, {
    x: 48,
    y: 55,
    size: 8,
    font: regular,
    color: muted,
  });

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receipt.receiptNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
