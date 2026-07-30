"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addGuardianAction,
  confirmStudentImportAction,
  createStudentAction,
  promoteStudentsAction,
  stageStudentImportAction,
  updateStudentStatusAction,
  uploadStudentDocumentAction,
  type StudentActionState,
} from "@/app/actions/students";

const initialState: StudentActionState = { status: "idle", message: "" };
type Option = { id: string; name: string; campusId?: string };

function Notice({ state }: { state: StudentActionState }) {
  if (state.status === "idle") return null;
  return (
    <p aria-live="polite" className="action-message" data-status={state.status}>
      {state.message}
    </p>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button className="button" disabled={pending} type="submit">
      {pending ? "Working…" : children}
    </button>
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
  const [state, action, pending] = useActionState(createStudentAction, initialState);
  const router = useRouter();
  useEffect(() => {
    if (state.status === "success" && state.id) router.push(`/students/${state.id}`);
  }, [router, state]);

  return (
    <form action={action} className="card mt-7 space-y-6 p-5 sm:p-7">
      <section>
        <h2 className="text-lg font-black">Student profile</h2>
        <div className="form-grid mt-4">
          <Field label="First name" name="firstName" required />
          <Field label="Middle name" name="middleName" />
          <Field label="Last name" name="lastName" required />
          <Field label="Date of birth" name="dateOfBirth" type="date" />
          <Select label="Gender" name="gender" options={[{ id: "MALE", name: "Male" }, { id: "FEMALE", name: "Female" }]} />
          <Field label="Admission date" name="admissionDate" type="date" required />
          <Field label="Admission number (leave blank to generate)" name="admissionNumber" />
          <Select label="Campus" name="campusId" options={campuses} required />
          <Select label="Class" name="classArmId" options={classArms} required />
          <Select label="Academic session" name="academicSessionId" options={sessions} required />
        </div>
        <label className="field mt-4">
          <span>Home address</span>
          <textarea className="input" name="address" />
        </label>
      </section>
      <section className="border-t border-[#e5e7eb] pt-6">
        <h2 className="text-lg font-black">Primary guardian</h2>
        <div className="form-grid mt-4">
          <Field label="First name" name="guardianFirstName" required />
          <Field label="Last name" name="guardianLastName" required />
          <Select
            label="Relationship"
            name="guardianRelationship"
            required
            options={relationshipOptions}
          />
          <Field label="Phone number" name="guardianPhone" required type="tel" />
          <Field label="Email" name="guardianEmail" type="email" />
          <Field label="Occupation" name="guardianOccupation" />
        </div>
      </section>
      <Notice state={state} />
      <div className="flex flex-wrap gap-3">
        <Submit pending={pending}>Create student</Submit>
        <Link className="button button-secondary" href="/students">Cancel</Link>
      </div>
    </form>
  );
}

export function StudentImportForm({
  campuses,
  classArms,
  sessions,
}: {
  campuses: Option[];
  classArms: Option[];
  sessions: Option[];
}) {
  const [state, action, pending] = useActionState(stageStudentImportAction, initialState);
  return (
    <form action={action} className="card mt-7 space-y-5 p-5 sm:p-7">
      <div className="form-grid">
        <Select label="Campus" name="campusId" options={campuses} required />
        <Select label="Class" name="classArmId" options={classArms} required />
        <Select label="Academic session" name="academicSessionId" options={sessions} required />
        <Field accept=".csv,.xlsx" label="Student file" name="file" required type="file" />
      </div>
      <p className="text-sm leading-6 text-[#68707d]">
        Maximum 1,000 rows or 5 MB. Nothing is imported until every row passes
        validation and you confirm the batch.
      </p>
      <Notice state={state} />
      {state.id && (
        <Link className="button button-secondary" href={`/students/import?job=${state.id}`}>
          Review validation
        </Link>
      )}
      <Submit pending={pending}>Validate file</Submit>
    </form>
  );
}

export function ConfirmImportButton({ jobId }: { jobId: string }) {
  const bound = confirmStudentImportAction.bind(null, jobId);
  const [state, action, pending] = useActionState(bound, initialState);
  return (
    <form action={action} className="space-y-3">
      <Notice state={state} />
      <Submit pending={pending}>Confirm and import records</Submit>
    </form>
  );
}

export function PromotionTable({
  students,
  targetClasses,
  sessions,
}: {
  students: Array<{
    id: string;
    name: string;
    admissionNumber: string;
    className: string;
    campusName: string;
  }>;
  targetClasses: Option[];
  sessions: Option[];
}) {
  const [state, action, pending] = useActionState(promoteStudentsAction, initialState);
  return (
    <form action={action} className="card mt-5 overflow-hidden">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Select</th>
              <th>Student</th>
              <th>Admission no.</th>
              <th>Current class</th>
              <th>Campus</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td><input aria-label={`Select ${student.name}`} name="studentId" type="checkbox" value={student.id} /></td>
                <td className="font-extrabold">{student.name}</td>
                <td>{student.admissionNumber}</td>
                <td>{student.className}</td>
                <td>{student.campusName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 border-t border-[#e5e7eb] p-5 md:grid-cols-4 md:items-end">
        <Select label="Promote to" name="targetClassArmId" options={targetClasses} required />
        <Select label="New session" name="targetSessionId" options={sessions} required />
        <Field label="Effective date" name="effectiveDate" type="date" required />
        <Submit pending={pending}>Promote selected</Submit>
      </div>
      <div className="px-5 pb-5"><Notice state={state} /></div>
    </form>
  );
}

export function GuardianForm({ studentId }: { studentId: string }) {
  const bound = addGuardianAction.bind(null, studentId);
  const [state, action, pending] = useActionState(bound, initialState);
  return (
    <form action={action} className="card space-y-4 p-5">
      <h2 className="text-lg font-black">Add another guardian</h2>
      <div className="form-grid">
        <Field label="First name" name="firstName" required />
        <Field label="Last name" name="lastName" required />
        <Field label="Phone" name="phone" required type="tel" />
        <Field label="Email" name="email" type="email" />
        <Field label="Occupation" name="occupation" />
        <Select label="Relationship" name="relationship" options={relationshipOptions} required />
      </div>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input name="isPrimaryContact" type="checkbox" /> Make primary contact
      </label>
      <Notice state={state} />
      <Submit pending={pending}>Add guardian</Submit>
    </form>
  );
}

export function StudentStatusForm({
  studentId,
  currentStatus,
}: {
  studentId: string;
  currentStatus: string;
}) {
  const bound = updateStudentStatusAction.bind(null, studentId);
  const [state, action, pending] = useActionState(bound, initialState);
  return (
    <form action={action} className="card space-y-4 p-5">
      <h2 className="text-lg font-black">Change student status</h2>
      <p className="text-sm text-[#68707d]">Current status: {currentStatus}</p>
      <Select
        label="New status"
        name="status"
        required
        options={[
          { id: "ACTIVE", name: "Active" },
          { id: "WITHDRAWN", name: "Withdrawn" },
          { id: "GRADUATED", name: "Graduated" },
          { id: "ARCHIVED", name: "Archived" },
        ]}
      />
      <Field label="Effective date" name="effectiveDate" required type="date" />
      <label className="field">
        <span>Reason</span>
        <textarea className="input" name="reason" required />
      </label>
      <Notice state={state} />
      <Submit pending={pending}>Update status</Submit>
    </form>
  );
}

export function StudentDocumentForm({ studentId }: { studentId: string }) {
  const bound = uploadStudentDocumentAction.bind(null, studentId);
  const [state, action, pending] = useActionState(bound, initialState);
  return (
    <form action={action} className="card space-y-4 p-5">
      <h2 className="text-lg font-black">Upload document</h2>
      <Select
        label="Document type"
        name="category"
        required
        options={[
          { id: "BIRTH_CERTIFICATE", name: "Birth certificate" },
          { id: "PREVIOUS_REPORT", name: "Previous report" },
          { id: "MEDICAL", name: "Medical" },
          { id: "ADMISSION_FORM", name: "Admission form" },
          { id: "OTHER", name: "Other" },
        ]}
      />
      <Field accept=".pdf,.jpg,.jpeg,.png" label="PDF, JPG or PNG (max 5 MB)" name="file" required type="file" />
      <Notice state={state} />
      <Submit pending={pending}>Upload</Submit>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  accept,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  accept?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input accept={accept} className="input" name={name} required={required} type={type} />
    </label>
  );
}

function Select({
  label,
  name,
  options,
  required,
}: {
  label: string;
  name: string;
  options: Option[];
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select className="input" defaultValue="" name={name} required={required}>
        <option disabled value="">Select…</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
    </label>
  );
}

const relationshipOptions = [
  { id: "FATHER", name: "Father" },
  { id: "MOTHER", name: "Mother" },
  { id: "GUARDIAN", name: "Guardian" },
  { id: "SIBLING", name: "Sibling" },
  { id: "RELATIVE", name: "Relative" },
  { id: "OTHER", name: "Other" },
];
