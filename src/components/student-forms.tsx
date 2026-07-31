"use client";

import { useActionState } from "react";
import {
  addGuardian,
  bulkPromoteStudents,
  createStudent,
  importStudents,
  reactivateStudent,
  uploadStudentDocument,
} from "@/app/actions/students";
import type { StudentActionState } from "@/app/actions/students";

type Option = { value: string; label: string };

const initialStudentActionState: StudentActionState = {
  status: "idle",
  message: "",
};

function Feedback({
  state,
}: {
  state: typeof initialStudentActionState;
}) {
  if (state.status === "idle") return null;
  return (
    <div
      aria-live="polite"
      className={`rounded-xl border px-4 py-3 text-sm font-bold ${
        state.status === "success"
          ? "border-[#b8dfc5] bg-[#effaf2] text-[#176b35]"
          : "border-[#f2b8bc] bg-[#fff1f2] text-[#a20e14]"
      }`}
    >
      <p>{state.message}</p>
      {!!state.errors?.length && (
        <ul className="mt-2 list-disc space-y-1 pl-5 font-medium">
          {state.errors.slice(0, 12).map((error, index) => (
            <li key={`${error.row}-${error.field}-${index}`}>
              Row {error.row}, {error.field}: {error.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Input({
  label,
  name,
  type = "text",
  required = true,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
}) {
  return (
    <label className="block text-sm font-extrabold">
      {label}
      <input
        className="mt-2 h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3 font-medium outline-none focus:border-[#d71920]"
        name={name}
        required={required}
        type={type}
        {...props}
      />
    </label>
  );
}

function Select({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: Option[];
}) {
  return (
    <label className="block text-sm font-extrabold">
      {label}
      <select
        className="mt-2 h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3 font-medium outline-none focus:border-[#d71920]"
        name={name}
        required
      >
        <option value="">Select…</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function StudentCreateForm({
  campuses,
  classArms,
  sessions,
}: {
  campuses: Option[];
  classArms: Option[];
  sessions: Option[];
}) {
  const [state, action, pending] = useActionState(
    createStudent,
    initialStudentActionState,
  );
  return (
    <form action={action} className="space-y-5">
      <Feedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="First name" name="firstName" />
        <Input
          label="Middle name"
          name="middleName"
          required={false}
        />
        <Input label="Last name" name="lastName" />
        <Select
          label="Gender"
          name="gender"
          options={[
            { value: "FEMALE", label: "Female" },
            { value: "MALE", label: "Male" },
          ]}
        />
        <Input
          label="Date of birth"
          name="dateOfBirth"
          required={false}
          type="date"
        />
        <Input label="Admission date" name="admissionDate" type="date" />
        <Select label="Campus" name="campusId" options={campuses} />
        <Select label="Class" name="classArmId" options={classArms} />
        <Select
          label="Academic session"
          name="academicSessionId"
          options={sessions}
        />
        <Input label="Home address" name="address" required={false} />
      </div>
      <div className="rounded-xl bg-[#f6f7f8] p-4">
        <h3 className="font-black">Primary guardian</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="First name" name="guardianFirstName" />
          <Input label="Last name" name="guardianLastName" />
          <Input label="Phone" name="guardianPhone" type="tel" />
          <Input
            label="Email"
            name="guardianEmail"
            required={false}
            type="email"
          />
          <Select
            label="Relationship"
            name="relationship"
            options={[
              { value: "FATHER", label: "Father" },
              { value: "MOTHER", label: "Mother" },
              { value: "GUARDIAN", label: "Guardian" },
              { value: "RELATIVE", label: "Relative" },
              { value: "OTHER", label: "Other" },
            ]}
          />
        </div>
      </div>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Saving…" : "Create student"}
      </button>
    </form>
  );
}

export function StudentImportForm() {
  const [state, action, pending] = useActionState(
    importStudents,
    initialStudentActionState,
  );
  return (
    <form action={action} className="space-y-5">
      <Feedback state={state} />
      <label className="block text-sm font-extrabold">
        Student spreadsheet
        <input
          accept=".csv,.xlsx"
          className="mt-2 block w-full rounded-xl border border-dashed border-[#cfd3d9] bg-[#fafafa] p-4 font-medium"
          name="file"
          required
          type="file"
        />
      </label>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Validating and importing…" : "Validate and import"}
      </button>
    </form>
  );
}

export function BulkPromotionForm({
  students,
  classArms,
  campuses,
  sessions,
}: {
  students: Array<{ value: string; label: string }>;
  classArms: Option[];
  campuses: Option[];
  sessions: Option[];
}) {
  const [state, action, pending] = useActionState(
    bulkPromoteStudents,
    initialStudentActionState,
  );
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-[#e0e3e7] p-2">
        {students.map((student) => (
          <label
            className="flex min-h-10 items-center gap-3 rounded-lg px-2 text-sm font-bold hover:bg-[#f6f7f8]"
            key={student.value}
          >
            <input name="studentId" type="checkbox" value={student.value} />
            {student.label}
          </label>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Campus" name="campusId" options={campuses} />
        <Select label="New class" name="classArmId" options={classArms} />
        <Select
          label="New academic session"
          name="academicSessionId"
          options={sessions}
        />
        <Input label="Starts on" name="startsOn" type="date" />
      </div>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Promoting…" : "Promote selected students"}
      </button>
    </form>
  );
}

export function StudentReactivationForm({
  studentId,
  campuses,
  classArms,
  sessions,
}: {
  studentId: string;
  campuses: Option[];
  classArms: Option[];
  sessions: Option[];
}) {
  const actionWithStudent = reactivateStudent.bind(null, studentId);
  const [state, action, pending] = useActionState(
    actionWithStudent,
    initialStudentActionState,
  );
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <p className="text-sm text-[#626b77]">
        Reactivation creates a new current enrollment. Earlier enrollment records
        remain unchanged.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Campus" name="campusId" options={campuses} />
        <Select label="New class" name="classArmId" options={classArms} />
        <Select
          label="Academic session"
          name="academicSessionId"
          options={sessions}
        />
        <Input label="Starts on" name="startsOn" type="date" />
      </div>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Reactivating…" : "Reactivate and enroll"}
      </button>
    </form>
  );
}

export function AddGuardianForm({ studentId }: { studentId: string }) {
  const actionWithStudent = addGuardian.bind(null, studentId);
  const [state, action, pending] = useActionState(
    actionWithStudent,
    initialStudentActionState,
  );
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="First name" name="firstName" />
        <Input label="Last name" name="lastName" />
        <Input label="Phone" name="phone" type="tel" />
        <Input label="Email" name="email" required={false} type="email" />
        <Select
          label="Relationship"
          name="relationship"
          options={[
            { value: "FATHER", label: "Father" },
            { value: "MOTHER", label: "Mother" },
            { value: "GUARDIAN", label: "Guardian" },
            { value: "SIBLING", label: "Sibling" },
            { value: "RELATIVE", label: "Relative" },
            { value: "OTHER", label: "Other" },
          ]}
        />
      </div>
      <div className="flex flex-wrap gap-5 text-sm font-bold">
        <label>
          <input className="mr-2" name="isPrimary" type="checkbox" value="yes" />
          Primary guardian
        </label>
        <label>
          <input className="mr-2" name="canPickup" type="checkbox" value="yes" />
          Authorized pickup
        </label>
      </div>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Adding…" : "Add guardian"}
      </button>
    </form>
  );
}

export function DocumentUploadForm({ studentId }: { studentId: string }) {
  const actionWithStudent = uploadStudentDocument.bind(null, studentId);
  const [state, action, pending] = useActionState(
    actionWithStudent,
    initialStudentActionState,
  );
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <Input label="Document label" name="name" placeholder="Birth certificate" />
      <Input
        accept=".pdf,.jpg,.jpeg,.png"
        label="File (maximum 4 MB)"
        name="file"
        type="file"
      />
      <button className="button" disabled={pending} type="submit">
        {pending ? "Uploading…" : "Upload document"}
      </button>
    </form>
  );
}
