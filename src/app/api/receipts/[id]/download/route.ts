import { headers } from "next/headers";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessCampus } from "@/lib/scope";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const membership = await db.schoolMembership.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    select: { schoolId: true, campusId: true, role: true },
  });
  if (!membership || !hasPermission(membership.role, "finance.read")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const payment = await db.payment.findFirst({
    where: { id, schoolId: membership.schoolId },
    include: {
      school: { select: { name: true } },
      campus: { select: { name: true } },
      term: {
        select: {
          name: true,
          academicSession: { select: { name: true } },
        },
      },
      account: {
        select: { displayName: true, admissionNumber: true },
      },
      reversal: { select: { reason: true, createdAt: true } },
    },
  });
  if (
    !payment ||
    !canAccessCampus({
      role: membership.role,
      assignedCampusId: membership.campusId,
      targetCampusId: payment.campusId,
    })
  ) {
    return new Response("Not found", { status: 404 });
  }
  const balance = await db.feeLedgerEntry.aggregate({
    where: { accountId: payment.accountId, termId: payment.termId },
    _sum: { amount: true },
  });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const red = rgb(0.84, 0.1, 0.13);
  const dark = rgb(0.12, 0.14, 0.17);
  const muted = rgb(0.38, 0.42, 0.47);
  page.drawRectangle({ x: 0, y: 815, width: 595, height: 27, color: red });
  page.drawText(payment.school.name, {
    x: 48,
    y: 770,
    size: 22,
    font: bold,
    color: dark,
  });
  page.drawText(`${payment.campus.name} | OFFICIAL PAYMENT RECEIPT`, {
    x: 48,
    y: 746,
    size: 10,
    font: bold,
    color: red,
  });
  page.drawText(payment.receiptNumber, {
    x: 365,
    y: 770,
    size: 13,
    font: bold,
    color: red,
  });
  page.drawLine({
    start: { x: 48, y: 720 },
    end: { x: 547, y: 720 },
    thickness: 1,
    color: rgb(0.85, 0.87, 0.89),
  });

  const rows = [
    ["Student", payment.account.displayName],
    ["Admission number", payment.account.admissionNumber],
    [
      "Academic period",
      `${payment.term.academicSession.name} | ${payment.term.name}`,
    ],
    ["Payment date", payment.paidAt.toLocaleString("en-NG")],
    ["Payment method", payment.method],
    ["Reference", payment.reference ?? "-"],
    ["Amount", `NGN ${Number(payment.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`],
    [
      "Balance after receipt",
      `NGN ${Number(balance._sum.amount ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
    ],
    ["Status", payment.reversal ? "REVERSED" : "POSTED"],
  ];
  let y = 680;
  for (const [label, text] of rows) {
    page.drawText(label.toUpperCase(), {
      x: 48,
      y,
      size: 8,
      font: bold,
      color: muted,
    });
    page.drawText(text, {
      x: 190,
      y: y - 1,
      size: 11,
      font: label === "Amount" ? bold : regular,
      color: label === "Amount" ? red : dark,
    });
    y -= 42;
  }
  if (payment.reversal) {
    page.drawText(`Reversal reason: ${payment.reversal.reason}`, {
      x: 48,
      y: y - 5,
      size: 10,
      font: bold,
      color: red,
      maxWidth: 490,
    });
  }
  page.drawText(
    `Generated from the Petra LMS immutable fee ledger. Verify with ${payment.receiptNumber}.`,
    {
      x: 48,
      y: 55,
      size: 8,
      font: regular,
      color: muted,
    },
  );
  const bytes = await pdf.save();
  const safeName = payment.receiptNumber.replaceAll("/", "-");
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
