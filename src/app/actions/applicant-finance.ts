"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { requireApplicant } from "@/lib/applicant-auth";
import {
  applicantPaymentMethods,
  entranceFeeKinds,
  entranceFeeLabel,
  type ApplicantPaymentMethod,
  type EntranceFeeKind,
} from "@/lib/applicant-finance";

const amountSchema = z.coerce.number().positive().max(10_000_000);
const optionalText = (value: FormDataEntryValue | null) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
};

function assertCampusAccess(
  viewer: { membership: { role: string; campusId: string | null } },
  campusId: string,
) {
  if (viewer.membership.role !== "OWNER" && viewer.membership.campusId !== campusId) {
    throw new Error("FORBIDDEN:CAMPUS");
  }
}

type ApplicationFinanceRow = {
  id: string;
  schoolId: string;
  campusId: string | null;
  classLevelId: string | null;
  status: string;
  applicationNumber: string;
};

type ChargeBalanceRow = {
  id: string;
  kind: EntranceFeeKind;
  amount: unknown;
  verified: unknown;
  pending: unknown;
};

async function applicationFinance(applicationId: string) {
  const [row] = await db.$queryRaw<ApplicationFinanceRow[]>`
    SELECT "id", "schoolId", "campusId", "classLevelId", "status"::text AS "status", "applicationNumber"
    FROM "admission_applications"
    WHERE "id"=${applicationId}
    LIMIT 1
  `;
  if (!row) throw new Error("NOT_FOUND:APPLICATION");
  return row;
}

async function balances(applicationId: string) {
  return db.$queryRaw<ChargeBalanceRow[]>`
    SELECT c."id", c."kind"::text AS "kind", c."amount",
      COALESCE(SUM(CASE WHEN p."status"='VERIFIED' THEN p."amount" ELSE 0 END),0) AS "verified",
      COALESCE(SUM(CASE WHEN p."status"='PENDING_VERIFICATION' THEN p."amount" ELSE 0 END),0) AS "pending"
    FROM "applicant_charges" c
    LEFT JOIN "applicant_payments" p ON p."chargeId"=c."id"
    WHERE c."applicationId"=${applicationId}
    GROUP BY c."id"
    ORDER BY CASE c."kind" WHEN 'FORM' THEN 1 ELSE 2 END
  `;
}

async function addChargeFromSchedule(
  application: ApplicationFinanceRow,
  kind: EntranceFeeKind,
  recordedById: string | null,
) {
  if (!application.campusId || !application.classLevelId) {
    throw new Error("INVALID:APPLICATION_PLACEMENT");
  }
  const [schedule] = await db.$queryRaw<Array<{ id: string; amount: unknown }>>`
    SELECT "id", "amount"
    FROM "entrance_fee_schedules"
    WHERE "schoolId"=${application.schoolId}
      AND "campusId"=${application.campusId}
      AND "classLevelId"=${application.classLevelId}
      AND "kind"=${kind}::"EntranceFeeKind"
      AND "isActive"=true
    LIMIT 1
  `;
  if (!schedule) return null;

  const chargeId = crypto.randomUUID();
  const description = entranceFeeLabel(kind);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "applicant_charges" (
        "id", "schoolId", "campusId", "applicationId", "scheduleId", "kind", "description", "amount"
      ) VALUES (
        ${chargeId}, ${application.schoolId}, ${application.campusId}, ${application.id}, ${schedule.id},
        ${kind}::"EntranceFeeKind", ${description}, ${Number(schedule.amount)}
      ) ON CONFLICT ("applicationId","kind") DO NOTHING
    `;
    const [charge] = await tx.$queryRaw<Array<{ id: string; amount: unknown }>>`
      SELECT "id", "amount" FROM "applicant_charges"
      WHERE "applicationId"=${application.id} AND "kind"=${kind}::"EntranceFeeKind"
      LIMIT 1
    `;
    if (!charge) throw new Error("FAILED:APPLICANT_CHARGE");
    await tx.$executeRaw`
      INSERT INTO "applicant_fee_ledger_entries" (
        "id", "schoolId", "campusId", "applicationId", "type", "amount",
        "referenceType", "referenceId", "description", "occurredAt", "recordedById"
      ) VALUES (
        ${crypto.randomUUID()}, ${application.schoolId}, ${application.campusId}, ${application.id},
        'CHARGE', ${Number(charge.amount)}, 'ApplicantCharge', ${charge.id}, ${description}, CURRENT_TIMESTAMP, ${recordedById}
      ) ON CONFLICT ("referenceType","referenceId","type") DO NOTHING
    `;
  });
  return chargeId;
}

async function reconcileApplication(applicationId: string, actorUserId: string | null) {
  const application = await applicationFinance(applicationId);
  let rows = await balances(applicationId);
  const form = rows.find((row) => row.kind === "FORM");
  const formSettled = Boolean(form && Number(form.amount) - Number(form.verified) <= 0);

  if (formSettled && !rows.some((row) => row.kind === "EXAM")) {
    await addChargeFromSchedule(application, "EXAM", actorUserId);
    rows = await balances(applicationId);
  }

  const currentForm = rows.find((row) => row.kind === "FORM");
  const exam = rows.find((row) => row.kind === "EXAM");
  const nextStatus =
    currentForm && Number(currentForm.amount) - Number(currentForm.verified) <= 0 &&
    exam && Number(exam.amount) - Number(exam.verified) <= 0
      ? "AWAITING_EXAMINATION"
      : "AWAITING_PAYMENT";

  if (["SUBMITTED", "AWAITING_PAYMENT", "AWAITING_EXAMINATION"].includes(application.status)) {
    await db.$executeRaw`
      UPDATE "admission_applications"
      SET "status"=${nextStatus}::"ApplicationStatus", "updatedAt"=CURRENT_TIMESTAMP
      WHERE "id"=${applicationId}
    `;
  }
}

async function receiptNumber(
  schoolId: string,
  campusId: string,
  year: number,
) {
  const [campus] = await db.campus.findMany({
    where: { id: campusId, schoolId },
    select: { code: true },
    take: 1,
  });
  if (!campus) throw new Error("NOT_FOUND:CAMPUS");
  const [sequence] = await db.$queryRaw<Array<{ currentNumber: number }>>`
    INSERT INTO "applicant_receipt_sequences" (
      "id", "schoolId", "campusId", "year", "currentNumber"
    ) VALUES (${crypto.randomUUID()}, ${schoolId}, ${campusId}, ${year}, 1)
    ON CONFLICT ("campusId","year") DO UPDATE
      SET "currentNumber"="applicant_receipt_sequences"."currentNumber"+1,
          "updatedAt"=CURRENT_TIMESTAMP
    RETURNING "currentNumber"
  `;
  return `ENT-${campus.code}-${year}-${String(sequence.currentNumber).padStart(6, "0")}`;
}

async function verifyPaymentRecord(paymentId: string, actorUserId: string) {
  const [payment] = await db.$queryRaw<
    Array<{
      id: string;
      schoolId: string;
      campusId: string;
      applicationId: string;
      amount: unknown;
      status: string;
      paidAt: Date;
    }>
  >`
    SELECT "id", "schoolId", "campusId", "applicationId", "amount", "status"::text AS "status", "paidAt"
    FROM "applicant_payments" WHERE "id"=${paymentId} LIMIT 1
  `;
  if (!payment) throw new Error("NOT_FOUND:PAYMENT");
  if (payment.status !== "PENDING_VERIFICATION") throw new Error("INVALID:PAYMENT_STATUS");
  const receipt = await receiptNumber(
    payment.schoolId,
    payment.campusId,
    payment.paidAt.getFullYear(),
  );

  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "applicant_payments"
      SET "status"='VERIFIED', "receiptNumber"=${receipt}, "verifiedAt"=CURRENT_TIMESTAMP,
          "verifiedById"=${actorUserId}
      WHERE "id"=${payment.id} AND "status"='PENDING_VERIFICATION'
    `;
    await tx.$executeRaw`
      INSERT INTO "applicant_fee_ledger_entries" (
        "id", "schoolId", "campusId", "applicationId", "type", "amount",
        "referenceType", "referenceId", "description", "occurredAt", "recordedById"
      ) VALUES (
        ${crypto.randomUUID()}, ${payment.schoolId}, ${payment.campusId}, ${payment.applicationId},
        'PAYMENT', ${-Number(payment.amount)}, 'ApplicantPayment', ${payment.id},
        ${`Entrance payment ${receipt}`}, ${payment.paidAt}, ${actorUserId}
      )
    `;
    await tx.auditLog.create({
      data: {
        schoolId: payment.schoolId,
        campusId: payment.campusId,
        actorUserId,
        action: "applicant_payment.verified",
        entityType: "ApplicantPayment",
        entityId: payment.id,
        before: { status: "PENDING_VERIFICATION" },
        after: { status: "VERIFIED", receiptNumber: receipt, amount: Number(payment.amount) },
      },
    });
  });
  await reconcileApplication(payment.applicationId, actorUserId);
  return receipt;
}

export async function startEntrancePayment() {
  const viewer = await requireApplicant();
  const application = await applicationFinance(viewer.applicationId);
  if (!["SUBMITTED", "AWAITING_PAYMENT"].includes(application.status)) {
    redirect("/apply/status");
  }
  const charge = await addChargeFromSchedule(application, "FORM", null);
  if (!charge) redirect("/apply/status?error=fee-not-configured");
  await reconcileApplication(application.id, null);
  await db.auditLog.create({
    data: {
      schoolId: application.schoolId,
      campusId: application.campusId,
      actorUserId: null,
      action: "applicant_charge.created",
      entityType: "AdmissionApplication",
      entityId: application.id,
      after: { kind: "FORM", applicationNumber: application.applicationNumber },
    },
  });
  revalidatePath("/apply/status");
  redirect("/apply/payment");
}

export async function submitApplicantPayment(chargeId: string, formData: FormData) {
  const viewer = await requireApplicant();
  const input = z.object({
    method: z.enum(["TRANSFER", "ONLINE"]),
    amount: amountSchema,
    reference: z.string().trim().min(3).max(120),
    paidAt: z.coerce.date(),
    note: z.string().trim().max(500).nullable(),
  }).parse({
    method: formData.get("method"),
    amount: formData.get("amount"),
    reference: formData.get("reference"),
    paidAt: formData.get("paidAt"),
    note: optionalText(formData.get("note")),
  });

  const [charge] = await db.$queryRaw<
    Array<{ id: string; schoolId: string; campusId: string; applicationId: string; kind: EntranceFeeKind; amount: unknown }>
  >`
    SELECT "id", "schoolId", "campusId", "applicationId", "kind"::text AS "kind", "amount"
    FROM "applicant_charges"
    WHERE "id"=${chargeId} AND "applicationId"=${viewer.applicationId}
    LIMIT 1
  `;
  if (!charge) throw new Error("NOT_FOUND:CHARGE");
  const rows = await balances(viewer.applicationId);
  const form = rows.find((row) => row.kind === "FORM");
  const formSettled = Boolean(form && Number(form.amount) - Number(form.verified) <= 0);
  if (charge.kind === "EXAM" && !formSettled) throw new Error("LOCKED:EXAM_FEE");
  const current = rows.find((row) => row.id === charge.id);
  const available = current
    ? Number(current.amount) - Number(current.verified) - Number(current.pending)
    : 0;
  if (input.amount > available + 0.001) throw new Error("INVALID:OVERPAYMENT");

  const paymentId = crypto.randomUUID();
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "applicant_payments" (
        "id", "schoolId", "campusId", "applicationId", "chargeId", "method", "amount",
        "reference", "paidAt", "note"
      ) VALUES (
        ${paymentId}, ${charge.schoolId}, ${charge.campusId}, ${charge.applicationId}, ${charge.id},
        ${input.method}::"PaymentMethod", ${input.amount}, ${input.reference}, ${input.paidAt}, ${input.note}
      )
    `;
    await tx.auditLog.create({
      data: {
        schoolId: charge.schoolId,
        campusId: charge.campusId,
        actorUserId: null,
        action: "applicant_payment.submitted",
        entityType: "ApplicantPayment",
        entityId: paymentId,
        after: { method: input.method, amount: input.amount, applicationNumber: viewer.applicationNumber },
      },
    });
  });
  revalidatePath("/apply/payment");
  redirect("/apply/payment?submitted=1");
}

export async function upsertEntranceFeeSchedule(formData: FormData) {
  const viewer = await requirePermission("admissions.manage");
  const input = z.object({
    campusId: z.string().trim().min(1),
    classLevelId: z.string().trim().min(1),
    kind: z.enum(entranceFeeKinds),
    amount: amountSchema,
    isActive: z.boolean(),
  }).parse({
    campusId: formData.get("campusId"),
    classLevelId: formData.get("classLevelId"),
    kind: formData.get("kind"),
    amount: formData.get("amount"),
    isActive: formData.get("isActive") === "on",
  });
  assertCampusAccess(viewer, input.campusId);
  const placement = await db.classArm.findFirst({
    where: {
      campusId: input.campusId,
      classLevelId: input.classLevelId,
      campus: { schoolId: viewer.membership.schoolId },
      classLevel: { schoolId: viewer.membership.schoolId },
    },
    select: { id: true },
  });
  if (!placement) throw new Error("INVALID:FEE_PLACEMENT");

  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "entrance_fee_schedules" (
        "id", "schoolId", "campusId", "classLevelId", "kind", "amount", "isActive", "createdById"
      ) VALUES (
        ${crypto.randomUUID()}, ${viewer.membership.schoolId}, ${input.campusId}, ${input.classLevelId},
        ${input.kind}::"EntranceFeeKind", ${input.amount}, ${input.isActive}, ${viewer.user.id}
      )
      ON CONFLICT ("campusId","classLevelId","kind") DO UPDATE
        SET "amount"=EXCLUDED."amount", "isActive"=EXCLUDED."isActive", "updatedAt"=CURRENT_TIMESTAMP
    `;
    await tx.auditLog.create({
      data: {
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        actorUserId: viewer.user.id,
        action: "entrance_fee_schedule.upserted",
        entityType: "EntranceFeeSchedule",
        entityId: `${input.campusId}:${input.classLevelId}:${input.kind}`,
        after: { kind: input.kind, amount: input.amount, isActive: input.isActive },
      },
    });
  });
  revalidatePath("/admissions-admin/payments");
}

export async function recordApplicantPayment(chargeId: string, formData: FormData) {
  const viewer = await requirePermission("admissions.manage");
  const input = z.object({
    method: z.enum(applicantPaymentMethods),
    amount: amountSchema,
    reference: z.string().trim().max(120).nullable(),
    paidAt: z.coerce.date(),
    note: z.string().trim().max(500).nullable(),
  }).parse({
    method: formData.get("method"),
    amount: formData.get("amount"),
    reference: optionalText(formData.get("reference")),
    paidAt: formData.get("paidAt"),
    note: optionalText(formData.get("note")),
  });
  const [charge] = await db.$queryRaw<
    Array<{ id: string; schoolId: string; campusId: string; applicationId: string }>
  >`
    SELECT "id", "schoolId", "campusId", "applicationId"
    FROM "applicant_charges" WHERE "id"=${chargeId} LIMIT 1
  `;
  if (!charge || charge.schoolId !== viewer.membership.schoolId) throw new Error("NOT_FOUND:CHARGE");
  assertCampusAccess(viewer, charge.campusId);
  const rows = await balances(charge.applicationId);
  const current = rows.find((row) => row.id === charge.id);
  const available = current
    ? Number(current.amount) - Number(current.verified) - Number(current.pending)
    : 0;
  if (input.amount > available + 0.001) throw new Error("INVALID:OVERPAYMENT");

  const paymentId = crypto.randomUUID();
  await db.$executeRaw`
    INSERT INTO "applicant_payments" (
      "id", "schoolId", "campusId", "applicationId", "chargeId", "method", "amount",
      "reference", "paidAt", "note"
    ) VALUES (
      ${paymentId}, ${charge.schoolId}, ${charge.campusId}, ${charge.applicationId}, ${charge.id},
      ${input.method}::"PaymentMethod", ${input.amount}, ${input.reference}, ${input.paidAt}, ${input.note}
    )
  `;
  await verifyPaymentRecord(paymentId, viewer.user.id);
  revalidatePath("/admissions-admin/payments");
}

export async function verifyApplicantPayment(paymentId: string) {
  const viewer = await requirePermission("admissions.manage");
  const [payment] = await db.$queryRaw<Array<{ schoolId: string; campusId: string }>>`
    SELECT "schoolId", "campusId" FROM "applicant_payments" WHERE "id"=${paymentId} LIMIT 1
  `;
  if (!payment || payment.schoolId !== viewer.membership.schoolId) throw new Error("NOT_FOUND:PAYMENT");
  assertCampusAccess(viewer, payment.campusId);
  await verifyPaymentRecord(paymentId, viewer.user.id);
  revalidatePath("/admissions-admin/payments");
  revalidatePath("/apply/payment");
}

export async function reverseApplicantPayment(paymentId: string, formData: FormData) {
  const viewer = await requirePermission("admissions.manage");
  const reason = z.string().trim().min(5).max(500).parse(formData.get("reason"));
  const [payment] = await db.$queryRaw<
    Array<{ schoolId: string; campusId: string; applicationId: string; amount: unknown; status: string }>
  >`
    SELECT "schoolId", "campusId", "applicationId", "amount", "status"::text AS "status"
    FROM "applicant_payments" WHERE "id"=${paymentId} LIMIT 1
  `;
  if (!payment || payment.schoolId !== viewer.membership.schoolId) throw new Error("NOT_FOUND:PAYMENT");
  assertCampusAccess(viewer, payment.campusId);
  if (payment.status !== "VERIFIED") throw new Error("INVALID:PAYMENT_STATUS");
  const application = await applicationFinance(payment.applicationId);
  if (!["AWAITING_PAYMENT", "AWAITING_EXAMINATION"].includes(application.status)) {
    throw new Error("LOCKED:APPLICATION_FINANCE");
  }

  await db.$transaction(async (tx) => {
    const reversalId = crypto.randomUUID();
    await tx.$executeRaw`
      INSERT INTO "applicant_payment_reversals" ("id", "paymentId", "reason", "recordedById")
      VALUES (${reversalId}, ${paymentId}, ${reason}, ${viewer.user.id})
    `;
    await tx.$executeRaw`
      UPDATE "applicant_payments" SET "status"='REVERSED' WHERE "id"=${paymentId} AND "status"='VERIFIED'
    `;
    await tx.$executeRaw`
      INSERT INTO "applicant_fee_ledger_entries" (
        "id", "schoolId", "campusId", "applicationId", "type", "amount",
        "referenceType", "referenceId", "description", "occurredAt", "recordedById"
      ) VALUES (
        ${crypto.randomUUID()}, ${payment.schoolId}, ${payment.campusId}, ${payment.applicationId},
        'REVERSAL', ${Number(payment.amount)}, 'ApplicantPaymentReversal', ${reversalId},
        ${`Payment reversal: ${reason}`}, CURRENT_TIMESTAMP, ${viewer.user.id}
      )
    `;
    await tx.auditLog.create({
      data: {
        schoolId: payment.schoolId,
        campusId: payment.campusId,
        actorUserId: viewer.user.id,
        action: "applicant_payment.reversed",
        entityType: "ApplicantPayment",
        entityId: paymentId,
        before: { status: "VERIFIED" },
        after: { status: "REVERSED", reason, amount: Number(payment.amount) },
      },
    });
  });
  await reconcileApplication(payment.applicationId, viewer.user.id);
  revalidatePath("/admissions-admin/payments");
  revalidatePath("/apply/payment");
}
