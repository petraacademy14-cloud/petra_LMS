"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type {
  PaymentMethod,
  ReminderChannel,
  StudentChargeType,
} from "@/generated/prisma/enums";
import type { ActionState } from "@/app/actions/foundation";
import { db } from "@/lib/db";
import {
  requireCampusAccess,
  requirePermission,
} from "@/lib/dal";
import {
  buildReminderMessage,
  formatReceiptNumber,
  ledgerAmount,
  reconciliationVariance,
} from "@/lib/finance";

const cuid = z.string().cuid();
const shortText = z.string().trim().min(2).max(100);
const note = z.string().trim().min(3).max(500);
const money = z.coerce.number().positive().max(100_000_000);

function actionError(error: unknown): ActionState {
  if (error instanceof z.ZodError) {
    return {
      status: "error",
      message: "Check the information entered and try again.",
      fieldErrors: error.flatten().fieldErrors,
    };
  }
  if (error instanceof Error) {
    const messages: Record<string, string> = {
      "NOT_FOUND:ACCOUNT": "The selected student fee account was not found.",
      "NOT_FOUND:TERM": "The selected term was not found for this campus.",
      "NOT_FOUND:STRUCTURE": "The selected fee structure was not found.",
      "NOT_FOUND:PAYMENT": "The selected payment was not found.",
      "NOT_FOUND:CHARGE": "The selected charge or discount was not found.",
      "INVALID:OVERPAYMENT":
        "This payment is higher than the student's outstanding balance.",
      "INVALID:NO_BALANCE": "This student has no outstanding balance.",
      "ALREADY_REVERSED": "This transaction has already been reversed.",
    };
    if (messages[error.message]) {
      return { status: "error", message: messages[error.message] };
    }
    if (error.message.startsWith("FORBIDDEN")) {
      return {
        status: "error",
        message: "You do not have access to complete this finance action.",
      };
    }
  }
  console.error(error);
  return {
    status: "error",
    message: "The finance transaction could not be saved. Please try again.",
  };
}

async function auditMetadata() {
  const requestHeaders = await headers();
  return {
    requestId:
      requestHeaders.get("x-request-id") ??
      requestHeaders.get("x-vercel-id") ??
      crypto.randomUUID(),
    ipAddress:
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: requestHeaders.get("user-agent"),
  };
}

async function audit(
  tx: Prisma.TransactionClient,
  input: {
    schoolId: string;
    campusId?: string | null;
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    after: Prisma.InputJsonValue;
  },
) {
  await tx.auditLog.create({
    data: { ...input, ...(await auditMetadata()) },
  });
}

async function scopedAccount(
  tx: Prisma.TransactionClient,
  input: {
    accountId: string;
    schoolId: string;
    campusId?: string;
  },
) {
  const account = await tx.studentFeeAccount.findFirst({
    where: {
      id: input.accountId,
      schoolId: input.schoolId,
      ...(input.campusId ? { campusId: input.campusId } : {}),
      isActive: true,
    },
    select: {
      id: true,
      campusId: true,
      displayName: true,
      admissionNumber: true,
    },
  });
  if (!account) throw new Error("NOT_FOUND:ACCOUNT");
  return account;
}

async function scopedTerm(
  tx: Prisma.TransactionClient,
  input: { termId: string; campusId: string },
) {
  const term = await tx.term.findFirst({
    where: { id: input.termId, campusId: input.campusId },
    select: { id: true, name: true },
  });
  if (!term) throw new Error("NOT_FOUND:TERM");
  return term;
}

export async function createFeeCategory(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const viewer = await requirePermission("school.manage");
    const input = z
      .object({
        name: shortText,
        code: z
          .string()
          .trim()
          .min(2)
          .max(16)
          .regex(/^[A-Za-z0-9-]+$/)
          .transform((value) => value.toUpperCase()),
        description: z.string().trim().max(250).optional(),
      })
      .parse(Object.fromEntries(formData));

    await db.$transaction(async (tx) => {
      const category = await tx.feeCategory.create({
        data: { schoolId: viewer.membership.schoolId, ...input },
      });
      await audit(tx, {
        schoolId: viewer.membership.schoolId,
        actorUserId: viewer.user.id,
        action: "fee_category.created",
        entityType: "FeeCategory",
        entityId: category.id,
        after: input,
      });
    });

    revalidatePath("/fees/structures");
    return { status: "success", message: "Fee category created." };
  } catch (error) {
    return actionError(error);
  }
}

export async function createFeeStructure(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission("finance.manage");
    const input = z
      .object({
        campusId: cuid,
        termId: cuid,
        classLevelId: cuid,
        categoryId: cuid,
        amount: money,
        dueOn: z.coerce.date().optional(),
      })
      .parse(Object.fromEntries(formData));
    const viewer = await requireCampusAccess(input.campusId);

    await db.$transaction(async (tx) => {
      const [term, classLevel, category] = await Promise.all([
        tx.term.findFirst({
          where: { id: input.termId, campusId: input.campusId },
          select: { id: true },
        }),
        tx.classLevel.findFirst({
          where: {
            id: input.classLevelId,
            schoolId: viewer.membership.schoolId,
          },
          select: { id: true },
        }),
        tx.feeCategory.findFirst({
          where: {
            id: input.categoryId,
            schoolId: viewer.membership.schoolId,
            isActive: true,
          },
          select: { id: true },
        }),
      ]);
      if (!term || !classLevel || !category) {
        throw new Error("NOT_FOUND:STRUCTURE");
      }

      const structure = await tx.feeStructure.create({
        data: {
          ...input,
          schoolId: viewer.membership.schoolId,
          amount: input.amount.toFixed(2),
        },
      });
      await audit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        actorUserId: viewer.user.id,
        action: "fee_structure.created",
        entityType: "FeeStructure",
        entityId: structure.id,
        after: {
          termId: input.termId,
          classLevelId: input.classLevelId,
          categoryId: input.categoryId,
          amount: input.amount,
          dueOn: input.dueOn?.toISOString() ?? null,
        },
      });
    });

    revalidatePath("/fees/structures");
    return { status: "success", message: "Fee structure created." };
  } catch (error) {
    return actionError(error);
  }
}

export async function applyFeeStructures(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission("finance.manage");
    const input = z
      .object({ campusId: cuid, termId: cuid })
      .parse(Object.fromEntries(formData));
    const viewer = await requireCampusAccess(input.campusId);

    const created = await db.$transaction(async (tx) => {
      await scopedTerm(tx, input);
      const structures = await tx.feeStructure.findMany({
        where: {
          schoolId: viewer.membership.schoolId,
          campusId: input.campusId,
          termId: input.termId,
          isActive: true,
        },
        select: {
          id: true,
          categoryId: true,
          classLevelId: true,
          amount: true,
          dueOn: true,
          category: { select: { name: true } },
        },
      });
      const accounts = await tx.studentFeeAccount.findMany({
        where: {
          schoolId: viewer.membership.schoolId,
          campusId: input.campusId,
          isActive: true,
          classArmId: { not: null },
        },
        select: {
          id: true,
          classArm: { select: { classLevelId: true } },
        },
      });
      let count = 0;
      for (const account of accounts) {
        for (const structure of structures) {
          if (account.classArm?.classLevelId !== structure.classLevelId) continue;
          const existing = await tx.studentCharge.findUnique({
            where: {
              accountId_feeStructureId: {
                accountId: account.id,
                feeStructureId: structure.id,
              },
            },
            select: { id: true },
          });
          if (existing) continue;
          const charge = await tx.studentCharge.create({
            data: {
              schoolId: viewer.membership.schoolId,
              campusId: input.campusId,
              accountId: account.id,
              termId: input.termId,
              categoryId: structure.categoryId,
              feeStructureId: structure.id,
              type: "CHARGE",
              description: structure.category.name,
              amount: structure.amount,
              dueOn: structure.dueOn,
            },
          });
          await tx.feeLedgerEntry.create({
            data: {
              schoolId: viewer.membership.schoolId,
              campusId: input.campusId,
              accountId: account.id,
              termId: input.termId,
              type: "CHARGE",
              amount: structure.amount,
              referenceType: "StudentCharge",
              referenceId: charge.id,
              description: structure.category.name,
              occurredAt: new Date(),
              recordedById: viewer.user.id,
            },
          });
          count += 1;
        }
      }
      await audit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        actorUserId: viewer.user.id,
        action: "fee_structures.applied",
        entityType: "FeeStructureBatch",
        entityId: crypto.randomUUID(),
        after: { termId: input.termId, chargesCreated: count },
      });
      return count;
    });

    revalidatePath("/fees");
    revalidatePath("/fees/structures");
    revalidatePath("/fees/reports");
    return {
      status: "success",
      message: `${created} new structured charge${created === 1 ? "" : "s"} posted. Existing charges were not duplicated.`,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function createStudentCharge(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission("finance.manage");
    const input = z
      .object({
        accountId: cuid,
        termId: cuid,
        categoryId: cuid.optional().or(z.literal("")),
        type: z.enum(["CHARGE", "DISCOUNT"]),
        description: shortText,
        amount: money,
        dueOn: z.coerce.date().optional(),
      })
      .parse(Object.fromEntries(formData));

    const account = await db.studentFeeAccount.findUnique({
      where: { id: input.accountId },
      select: { campusId: true },
    });
    if (!account) throw new Error("NOT_FOUND:ACCOUNT");
    const viewer = await requireCampusAccess(account.campusId);

    await db.$transaction(async (tx) => {
      const scoped = await scopedAccount(tx, {
        accountId: input.accountId,
        schoolId: viewer.membership.schoolId,
        campusId: account.campusId,
      });
      await scopedTerm(tx, {
        termId: input.termId,
        campusId: account.campusId,
      });
      if (input.categoryId) {
        const category = await tx.feeCategory.findFirst({
          where: {
            id: input.categoryId,
            schoolId: viewer.membership.schoolId,
          },
          select: { id: true },
        });
        if (!category) throw new Error("NOT_FOUND:STRUCTURE");
      }

      const charge = await tx.studentCharge.create({
        data: {
          schoolId: viewer.membership.schoolId,
          campusId: account.campusId,
          accountId: scoped.id,
          termId: input.termId,
          categoryId: input.categoryId || null,
          type: input.type as StudentChargeType,
          description: input.description,
          amount: input.amount.toFixed(2),
          dueOn: input.dueOn,
        },
      });
      await tx.feeLedgerEntry.create({
        data: {
          schoolId: viewer.membership.schoolId,
          campusId: account.campusId,
          accountId: scoped.id,
          termId: input.termId,
          type: input.type,
          amount: ledgerAmount(input.type, input.amount).toFixed(2),
          referenceType: "StudentCharge",
          referenceId: charge.id,
          description: input.description,
          occurredAt: new Date(),
          recordedById: viewer.user.id,
        },
      });
      await audit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: account.campusId,
        actorUserId: viewer.user.id,
        action:
          input.type === "CHARGE"
            ? "student_charge.created"
            : "student_discount.created",
        entityType: "StudentCharge",
        entityId: charge.id,
        after: {
          accountId: scoped.id,
          type: input.type,
          amount: input.amount,
          description: input.description,
        },
      });
    });

    revalidatePath("/fees");
    revalidatePath("/fees/record");
    revalidatePath("/fees/reports");
    return {
      status: "success",
      message:
        input.type === "CHARGE"
          ? "Student charge posted."
          : "Student discount posted.",
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function recordPayment(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission("finance.manage");
    const input = z
      .object({
        accountId: cuid,
        termId: cuid,
        method: z.enum(["CASH", "TRANSFER", "POS", "ONLINE"]),
        amount: money,
        paidAt: z.coerce.date(),
        reference: z.string().trim().max(100).optional(),
        note: z.string().trim().max(500).optional(),
      })
      .parse(Object.fromEntries(formData));

    const accountCampus = await db.studentFeeAccount.findUnique({
      where: { id: input.accountId },
      select: { campusId: true },
    });
    if (!accountCampus) throw new Error("NOT_FOUND:ACCOUNT");
    const viewer = await requireCampusAccess(accountCampus.campusId);

    const payment = await db.$transaction(async (tx) => {
      const account = await scopedAccount(tx, {
        accountId: input.accountId,
        schoolId: viewer.membership.schoolId,
        campusId: accountCampus.campusId,
      });
      await scopedTerm(tx, {
        termId: input.termId,
        campusId: account.campusId,
      });

      const current = await tx.feeLedgerEntry.aggregate({
        where: { accountId: account.id, termId: input.termId },
        _sum: { amount: true },
      });
      const balance = Number(current._sum.amount ?? 0);
      if (balance <= 0) throw new Error("INVALID:NO_BALANCE");
      if (input.amount > balance) throw new Error("INVALID:OVERPAYMENT");

      const campus = await tx.campus.findUniqueOrThrow({
        where: { id: account.campusId },
        select: { code: true },
      });
      const year = input.paidAt.getFullYear();
      const sequence = await tx.receiptSequence.upsert({
        where: {
          campusId_year: { campusId: account.campusId, year },
        },
        create: {
          schoolId: viewer.membership.schoolId,
          campusId: account.campusId,
          year,
          currentNumber: 1,
        },
        update: { currentNumber: { increment: 1 } },
        select: { currentNumber: true },
      });
      const receiptNumber = formatReceiptNumber({
        campusCode: campus.code,
        year,
        sequence: sequence.currentNumber,
      });

      const created = await tx.payment.create({
        data: {
          schoolId: viewer.membership.schoolId,
          campusId: account.campusId,
          accountId: account.id,
          termId: input.termId,
          receiptNumber,
          method: input.method as PaymentMethod,
          amount: input.amount.toFixed(2),
          reference: input.reference || null,
          paidAt: input.paidAt,
          note: input.note || null,
          recordedById: viewer.user.id,
        },
      });
      await tx.feeLedgerEntry.create({
        data: {
          schoolId: viewer.membership.schoolId,
          campusId: account.campusId,
          accountId: account.id,
          termId: input.termId,
          type: "PAYMENT",
          amount: ledgerAmount("PAYMENT", input.amount).toFixed(2),
          referenceType: "Payment",
          referenceId: created.id,
          description: `Payment ${receiptNumber}`,
          occurredAt: input.paidAt,
          recordedById: viewer.user.id,
        },
      });

      const charges = await tx.studentCharge.findMany({
        where: {
          accountId: account.id,
          termId: input.termId,
          type: "CHARGE",
          reversal: null,
        },
        select: {
          id: true,
          amount: true,
          allocations: {
            where: { payment: { reversal: null } },
            select: { amount: true },
          },
        },
        orderBy: [{ dueOn: "asc" }, { createdAt: "asc" }],
      });
      let remaining = input.amount;
      for (const charge of charges) {
        if (remaining <= 0) break;
        const allocated = charge.allocations.reduce(
          (sum, item) => sum + Number(item.amount),
          0,
        );
        const open = Math.max(0, Number(charge.amount) - allocated);
        const allocation = Math.min(open, remaining);
        if (allocation > 0) {
          await tx.paymentAllocation.create({
            data: {
              paymentId: created.id,
              chargeId: charge.id,
              amount: allocation.toFixed(2),
            },
          });
          remaining -= allocation;
        }
      }

      await audit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: account.campusId,
        actorUserId: viewer.user.id,
        action: "payment.recorded",
        entityType: "Payment",
        entityId: created.id,
        after: {
          accountId: account.id,
          receiptNumber,
          method: input.method,
          amount: input.amount,
          reference: input.reference || null,
        },
      });
      return created;
    });

    revalidatePath("/fees");
    revalidatePath("/fees/record");
    revalidatePath("/fees/reports");
    revalidatePath(`/fees/receipts/${payment.id}`);
    return {
      status: "success",
      message: `Payment recorded. Receipt ${payment.receiptNumber}.`,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function reversePayment(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission("finance.manage");
    const input = z
      .object({ paymentId: cuid, reason: note })
      .parse(Object.fromEntries(formData));
    const existing = await db.payment.findUnique({
      where: { id: input.paymentId },
      select: { campusId: true },
    });
    if (!existing) throw new Error("NOT_FOUND:PAYMENT");
    const viewer = await requireCampusAccess(existing.campusId);

    await db.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: {
          id: input.paymentId,
          schoolId: viewer.membership.schoolId,
        },
        include: { reversal: { select: { id: true } } },
      });
      if (!payment) throw new Error("NOT_FOUND:PAYMENT");
      if (payment.reversal) throw new Error("ALREADY_REVERSED");

      const reversal = await tx.paymentReversal.create({
        data: {
          paymentId: payment.id,
          reason: input.reason,
          recordedById: viewer.user.id,
        },
      });
      await tx.feeLedgerEntry.create({
        data: {
          schoolId: payment.schoolId,
          campusId: payment.campusId,
          accountId: payment.accountId,
          termId: payment.termId,
          type: "REVERSAL",
          amount: Number(payment.amount).toFixed(2),
          referenceType: "PaymentReversal",
          referenceId: reversal.id,
          description: `Reversal of ${payment.receiptNumber}: ${input.reason}`,
          occurredAt: new Date(),
          recordedById: viewer.user.id,
        },
      });
      await audit(tx, {
        schoolId: payment.schoolId,
        campusId: payment.campusId,
        actorUserId: viewer.user.id,
        action: "payment.reversed",
        entityType: "PaymentReversal",
        entityId: reversal.id,
        after: {
          paymentId: payment.id,
          receiptNumber: payment.receiptNumber,
          amount: Number(payment.amount),
          reason: input.reason,
        },
      });
    });

    revalidatePath("/fees");
    revalidatePath("/fees/record");
    revalidatePath("/fees/reports");
    revalidatePath(`/fees/receipts/${input.paymentId}`);
    return { status: "success", message: "Payment reversed with audit history." };
  } catch (error) {
    return actionError(error);
  }
}

export async function reverseCharge(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission("finance.manage");
    const input = z
      .object({ chargeId: cuid, reason: note })
      .parse(Object.fromEntries(formData));
    const existing = await db.studentCharge.findUnique({
      where: { id: input.chargeId },
      select: { campusId: true },
    });
    if (!existing) throw new Error("NOT_FOUND:CHARGE");
    const viewer = await requireCampusAccess(existing.campusId);

    await db.$transaction(async (tx) => {
      const charge = await tx.studentCharge.findFirst({
        where: {
          id: input.chargeId,
          schoolId: viewer.membership.schoolId,
        },
        include: { reversal: { select: { id: true } } },
      });
      if (!charge) throw new Error("NOT_FOUND:CHARGE");
      if (charge.reversal) throw new Error("ALREADY_REVERSED");

      const reversal = await tx.chargeReversal.create({
        data: {
          chargeId: charge.id,
          reason: input.reason,
          recordedById: viewer.user.id,
        },
      });
      const original = ledgerAmount(charge.type, charge.amount);
      await tx.feeLedgerEntry.create({
        data: {
          schoolId: charge.schoolId,
          campusId: charge.campusId,
          accountId: charge.accountId,
          termId: charge.termId,
          type: "REVERSAL",
          amount: (-original).toFixed(2),
          referenceType: "ChargeReversal",
          referenceId: reversal.id,
          description: `Reversal of ${charge.description}: ${input.reason}`,
          occurredAt: new Date(),
          recordedById: viewer.user.id,
        },
      });
      await audit(tx, {
        schoolId: charge.schoolId,
        campusId: charge.campusId,
        actorUserId: viewer.user.id,
        action: "student_charge.reversed",
        entityType: "ChargeReversal",
        entityId: reversal.id,
        after: {
          chargeId: charge.id,
          type: charge.type,
          amount: Number(charge.amount),
          reason: input.reason,
        },
      });
    });

    revalidatePath("/fees");
    revalidatePath("/fees/record");
    revalidatePath("/fees/reports");
    return { status: "success", message: "Charge reversed with audit history." };
  } catch (error) {
    return actionError(error);
  }
}

export async function reconcilePayments(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission("finance.reconcile");
    const input = z
      .object({
        campusId: cuid,
        businessDate: z.string().date(),
        method: z.enum(["CASH", "TRANSFER", "POS", "ONLINE"]),
        declaredAmount: z.coerce.number().min(0).max(100_000_000),
        note: z.string().trim().max(500).optional(),
      })
      .parse(Object.fromEntries(formData));
    const viewer = await requireCampusAccess(input.campusId);
    const start = new Date(`${input.businessDate}T00:00:00+01:00`);
    const end = new Date(start.getTime() + 86_400_000);

    const batch = await db.$transaction(async (tx) => {
      const expected = await tx.payment.aggregate({
        where: {
          schoolId: viewer.membership.schoolId,
          campusId: input.campusId,
          method: input.method,
          paidAt: { gte: start, lt: end },
          reversal: null,
        },
        _sum: { amount: true },
      });
      const expectedAmount = Number(expected._sum.amount ?? 0);
      const variance = reconciliationVariance(
        expectedAmount,
        input.declaredAmount,
      );
      const created = await tx.reconciliationBatch.upsert({
        where: {
          campusId_businessDate_method: {
            campusId: input.campusId,
            businessDate: start,
            method: input.method as PaymentMethod,
          },
        },
        create: {
          schoolId: viewer.membership.schoolId,
          campusId: input.campusId,
          businessDate: start,
          method: input.method as PaymentMethod,
          status: variance === 0 ? "RECONCILED" : "OPEN",
          expectedAmount: expectedAmount.toFixed(2),
          declaredAmount: input.declaredAmount.toFixed(2),
          variance: variance.toFixed(2),
          note: input.note || null,
          reconciledById: viewer.user.id,
        },
        update: {
          status: variance === 0 ? "RECONCILED" : "OPEN",
          expectedAmount: expectedAmount.toFixed(2),
          declaredAmount: input.declaredAmount.toFixed(2),
          variance: variance.toFixed(2),
          note: input.note || null,
          reconciledById: viewer.user.id,
          createdAt: new Date(),
        },
      });
      await audit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        actorUserId: viewer.user.id,
        action: "payments.reconciled",
        entityType: "ReconciliationBatch",
        entityId: created.id,
        after: {
          businessDate: input.businessDate,
          method: input.method,
          expectedAmount,
          declaredAmount: input.declaredAmount,
          variance,
        },
      });
      return created;
    });

    revalidatePath("/fees/reconciliation");
    return {
      status: "success",
      message:
        Number(batch.variance) === 0
          ? "Reconciliation matched and was closed."
          : `Saved with a variance of ₦${Number(batch.variance).toLocaleString("en-NG", { minimumFractionDigits: 2 })}.`,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function generateReminders(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission("finance.manage");
    const input = z
      .object({
        campusId: cuid,
        termId: cuid,
        channel: z.enum(["PRINT", "WHATSAPP", "SMS", "EMAIL"]),
      })
      .parse(Object.fromEntries(formData));
    const viewer = await requireCampusAccess(input.campusId);

    const created = await db.$transaction(async (tx) => {
      const term = await scopedTerm(tx, {
        termId: input.termId,
        campusId: input.campusId,
      });
      const balances = await tx.feeLedgerEntry.groupBy({
        by: ["accountId"],
        where: {
          schoolId: viewer.membership.schoolId,
          campusId: input.campusId,
          termId: input.termId,
        },
        _sum: { amount: true },
      });
      const owing = balances.filter(
        (item) => Number(item._sum.amount ?? 0) > 0,
      );
      const accounts = await tx.studentFeeAccount.findMany({
        where: { id: { in: owing.map((item) => item.accountId) } },
        select: { id: true, displayName: true },
      });
      const accountMap = new Map(accounts.map((item) => [item.id, item]));

      for (const item of owing) {
        const account = accountMap.get(item.accountId);
        if (!account) continue;
        const balance = Number(item._sum.amount ?? 0);
        await tx.feeReminder.create({
          data: {
            schoolId: viewer.membership.schoolId,
            campusId: input.campusId,
            accountId: account.id,
            termId: input.termId,
            channel: input.channel as ReminderChannel,
            balance: balance.toFixed(2),
            message: buildReminderMessage({
              studentName: account.displayName,
              termName: term.name,
              balance,
              schoolName: viewer.membership.school.name,
            }),
            generatedById: viewer.user.id,
          },
        });
      }
      await audit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        actorUserId: viewer.user.id,
        action: "fee_reminders.generated",
        entityType: "FeeReminderBatch",
        entityId: crypto.randomUUID(),
        after: {
          termId: input.termId,
          channel: input.channel,
          count: owing.length,
        },
      });
      return owing.length;
    });

    revalidatePath("/fees/reminders");
    return {
      status: "success",
      message: `${created} reminder${created === 1 ? "" : "s"} generated as drafts.`,
    };
  } catch (error) {
    return actionError(error);
  }
}
