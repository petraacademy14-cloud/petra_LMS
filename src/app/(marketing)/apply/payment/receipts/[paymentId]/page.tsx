import type { Metadata } from "next";
import Link from "next/link";
import { ApplicantReceiptActions } from "@/components/applicant-receipt-actions";
import { formatNaira, entranceFeeLabel, type EntranceFeeKind } from "@/lib/applicant-finance";
import { requireApplicant } from "@/lib/applicant-auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Entrance payment receipt" };

type ReceiptRow = {
  id: string;
  receiptNumber: string;
  amount: unknown;
  method: string;
  reference: string | null;
  paidAt: Date;
  verifiedAt: Date;
  status: string;
  kind: EntranceFeeKind;
  applicationNumber: string;
  studentFirstName: string | null;
  studentLastName: string | null;
  campusName: string;
  className: string;
  schoolName: string;
};

export default async function ApplicantReceiptPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const viewer = await requireApplicant();
  const { paymentId } = await params;
  const [receipt] = await db.$queryRaw<ReceiptRow[]>`
    SELECT p."id", p."receiptNumber", p."amount", p."method"::text AS "method",
      p."reference", p."paidAt", p."verifiedAt", p."status"::text AS "status",
      ch."kind"::text AS "kind", a."applicationNumber", a."studentFirstName", a."studentLastName",
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
  if (!receipt) throw new Error("NOT_FOUND:RECEIPT");

  return (
    <section className="marketing-section applicant-workspace-section">
      <div className="marketing-shell max-w-4xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 receipt-actions">
          <Link className="text-link" href="/apply/payment">← Back to payments</Link>
          <ApplicantReceiptActions paymentId={receipt.id} />
        </div>
        <article className="receipt-sheet card overflow-hidden bg-white">
          <div className="h-3 bg-[#a50e12]" />
          <div className="p-7 sm:p-10">
            <header className="flex flex-wrap items-start justify-between gap-5 border-b border-[#e5e7eb] pb-7">
              <div><p className="eyebrow">Official entrance payment receipt</p><h1 className="page-title">{receipt.schoolName}</h1><p className="page-subtitle">{receipt.campusName} campus</p></div>
              <div className="text-right"><p className="text-xs font-black uppercase tracking-wider text-[#7b838e]">Receipt number</p><strong className="mt-1 block text-lg text-[#a50e12]">{receipt.receiptNumber}</strong></div>
            </header>
            <dl className="mt-8 grid gap-5 sm:grid-cols-2">
              <div><dt>Applicant</dt><dd>{receipt.studentFirstName} {receipt.studentLastName}</dd></div>
              <div><dt>Application number</dt><dd>{receipt.applicationNumber}</dd></div>
              <div><dt>Class</dt><dd>{receipt.className}</dd></div>
              <div><dt>Fee</dt><dd>{entranceFeeLabel(receipt.kind)}</dd></div>
              <div><dt>Payment date</dt><dd>{receipt.paidAt.toLocaleString("en-NG")}</dd></div>
              <div><dt>Payment method</dt><dd>{receipt.method}</dd></div>
              <div><dt>Reference</dt><dd>{receipt.reference ?? "—"}</dd></div>
              <div><dt>Status</dt><dd>{receipt.status === "REVERSED" ? "REVERSED" : "VERIFIED"}</dd></div>
            </dl>
            <div className="mt-9 rounded-2xl bg-[#fff0f1] p-6">
              <p className="text-xs font-black uppercase tracking-wider text-[#8f1115]">Amount received</p>
              <strong className="mt-2 block text-3xl text-[#a50e12]">{formatNaira(Number(receipt.amount))}</strong>
            </div>
            <p className="mt-8 text-sm leading-6 text-[#6f7782]">Generated from Petra Academy’s append-only applicant payment ledger. Keep this receipt number for verification with the admissions office.</p>
          </div>
        </article>
      </div>
    </section>
  );
}
