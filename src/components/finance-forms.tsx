"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import {
  applyFeeStructures,
  createFeeCategory,
  createFeeStructure,
  createStudentCharge,
  generateReminders,
  reconcilePayments,
  recordPayment,
  reverseCharge,
  reversePayment,
} from "@/app/actions/finance";
import {
  initialActionState,
  type ActionState,
} from "@/app/actions/foundation";

type ServerAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

type Option = { value: string; label: string };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="button w-full sm:w-auto" disabled={pending} type="submit">
      {pending && <LoaderCircle className="animate-spin" size={17} />}
      {pending ? "Saving…" : label}
    </button>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p
      aria-live="polite"
      className={`rounded-xl px-3 py-2.5 text-sm font-bold ${
        state.status === "success"
          ? "bg-[#e8f7ef] text-[#14804a]"
          : "bg-[#fff0f1] text-[#a80f15]"
      }`}
    >
      {state.message}
    </p>
  );
}

function ActionForm({
  action,
  label,
  children,
  reset = true,
}: {
  action: ServerAction;
  label: string;
  children: React.ReactNode;
  reset?: boolean;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (reset && state.status === "success") ref.current?.reset();
  }, [reset, state.status]);
  return (
    <form action={formAction} className="space-y-4" ref={ref}>
      {children}
      <Feedback state={state} />
      <Submit label={label} />
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  min,
  step,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  min?: string | number;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold text-[#555e69]">
        {label}
      </span>
      <input
        className="h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3 outline-none focus:border-[#d71920]"
        min={min}
        name={name}
        placeholder={placeholder}
        required={required}
        step={step}
        type={type}
      />
    </label>
  );
}

function Select({
  label,
  name,
  options,
  optional = false,
}: {
  label: string;
  name: string;
  options: Option[];
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold text-[#555e69]">
        {label}
      </span>
      <select
        className="h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3 outline-none focus:border-[#d71920]"
        defaultValue=""
        name={name}
        required={!optional}
      >
        <option disabled={!optional} value="">
          {optional ? "None" : "Select…"}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Notes({
  label,
  name,
  required = false,
}: {
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold text-[#555e69]">
        {label}
      </span>
      <textarea
        className="min-h-24 w-full rounded-xl border border-[#dfe2e6] bg-white p-3 outline-none focus:border-[#d71920]"
        name={name}
        required={required}
      />
    </label>
  );
}

export function FeeCategoryForm() {
  return (
    <ActionForm action={createFeeCategory} label="Create category">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category name" name="name" placeholder="Tuition" />
        <Field label="Code" name="code" placeholder="TUITION" />
      </div>
      <Field
        label="Description"
        name="description"
        placeholder="Optional note"
        required={false}
      />
    </ActionForm>
  );
}

export function FeeStructureForm({
  campuses,
  terms,
  classLevels,
  categories,
}: {
  campuses: Option[];
  terms: Option[];
  classLevels: Option[];
  categories: Option[];
}) {
  return (
    <ActionForm action={createFeeStructure} label="Create structure">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Campus" name="campusId" options={campuses} />
        <Select label="Term" name="termId" options={terms} />
        <Select label="Class level" name="classLevelId" options={classLevels} />
        <Select label="Fee category" name="categoryId" options={categories} />
        <Field
          label="Amount (₦)"
          min="0.01"
          name="amount"
          step="0.01"
          type="number"
        />
        <Field label="Due date" name="dueOn" required={false} type="date" />
      </div>
    </ActionForm>
  );
}

export function ApplyStructuresForm({
  campuses,
  terms,
}: {
  campuses: Option[];
  terms: Option[];
}) {
  return (
    <ActionForm action={applyFeeStructures} label="Apply structures">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Campus" name="campusId" options={campuses} />
        <Select label="Term" name="termId" options={terms} />
      </div>
      <p className="text-xs leading-5 text-[#747d88]">
        Posts each matching class structure once per active student. Running it
        again is safe and will not duplicate charges.
      </p>
    </ActionForm>
  );
}

export function ChargeForm({
  accounts,
  terms,
  categories,
}: {
  accounts: Option[];
  terms: Option[];
  categories: Option[];
}) {
  return (
    <ActionForm action={createStudentCharge} label="Post to ledger">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Student" name="accountId" options={accounts} />
        <Select label="Term" name="termId" options={terms} />
        <Select
          label="Entry type"
          name="type"
          options={[
            { value: "CHARGE", label: "Charge" },
            { value: "DISCOUNT", label: "Discount" },
          ]}
        />
        <Select
          label="Fee category"
          name="categoryId"
          optional
          options={categories}
        />
        <Field
          label="Amount (₦)"
          min="0.01"
          name="amount"
          step="0.01"
          type="number"
        />
        <Field label="Due date" name="dueOn" required={false} type="date" />
      </div>
      <Field
        label="Description"
        name="description"
        placeholder="e.g. Tuition adjustment"
      />
    </ActionForm>
  );
}

export function PaymentForm({
  accounts,
  terms,
}: {
  accounts: Option[];
  terms: Option[];
}) {
  return (
    <ActionForm action={recordPayment} label="Record payment">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Student" name="accountId" options={accounts} />
        <Select label="Term" name="termId" options={terms} />
        <Select
          label="Payment method"
          name="method"
          options={[
            { value: "CASH", label: "Cash" },
            { value: "TRANSFER", label: "Bank transfer" },
            { value: "POS", label: "POS" },
            { value: "ONLINE", label: "Online (manual record)" },
          ]}
        />
        <Field
          label="Amount (₦)"
          min="0.01"
          name="amount"
          step="0.01"
          type="number"
        />
        <Field label="Payment date/time" name="paidAt" type="datetime-local" />
        <Field
          label="Reference"
          name="reference"
          placeholder="Teller, transfer or POS reference"
          required={false}
        />
      </div>
      <Notes label="Internal note (optional)" name="note" />
    </ActionForm>
  );
}

export function PaymentReversalForm({ payments }: { payments: Option[] }) {
  return (
    <ActionForm action={reversePayment} label="Reverse payment">
      <Select label="Payment receipt" name="paymentId" options={payments} />
      <Notes label="Reason for reversal" name="reason" required />
    </ActionForm>
  );
}

export function ChargeReversalForm({ charges }: { charges: Option[] }) {
  return (
    <ActionForm action={reverseCharge} label="Reverse entry">
      <Select label="Charge or discount" name="chargeId" options={charges} />
      <Notes label="Reason for reversal" name="reason" required />
    </ActionForm>
  );
}

export function ReconciliationForm({ campuses }: { campuses: Option[] }) {
  return (
    <ActionForm action={reconcilePayments} label="Check and save">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Campus" name="campusId" options={campuses} />
        <Field label="Business date" name="businessDate" type="date" />
        <Select
          label="Payment method"
          name="method"
          options={[
            { value: "CASH", label: "Cash" },
            { value: "TRANSFER", label: "Bank transfer" },
            { value: "POS", label: "POS" },
            { value: "ONLINE", label: "Online (manual record)" },
          ]}
        />
        <Field
          label="Declared amount (₦)"
          min="0"
          name="declaredAmount"
          step="0.01"
          type="number"
        />
      </div>
      <Notes label="Reconciliation note (optional)" name="note" />
    </ActionForm>
  );
}

export function ReminderForm({
  campuses,
  terms,
}: {
  campuses: Option[];
  terms: Option[];
}) {
  return (
    <ActionForm action={generateReminders} label="Generate reminder drafts">
      <div className="grid gap-4 sm:grid-cols-3">
        <Select label="Campus" name="campusId" options={campuses} />
        <Select label="Term" name="termId" options={terms} />
        <Select
          label="Output channel"
          name="channel"
          options={[
            { value: "PRINT", label: "Printable letter" },
            { value: "WHATSAPP", label: "WhatsApp draft" },
            { value: "SMS", label: "SMS draft" },
            { value: "EMAIL", label: "Email draft" },
          ]}
        />
      </div>
    </ActionForm>
  );
}
