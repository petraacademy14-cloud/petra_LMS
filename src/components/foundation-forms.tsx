"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, Plus, UsersRound } from "lucide-react";
import {
  createAcademicSession,
  createCampus,
  createTerm,
  initialActionState,
  type ActionState,
} from "@/app/actions/foundation";
import {
  assignClassTeacher,
  createClassWithDefaultArms,
  createSubjectForCampus,
} from "@/app/actions/class-management";

type ServerAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

type Option = { value: string; label: string };

type ClassArmOption = {
  id: string;
  campusId: string;
  campusName: string;
  label: string;
  studentCount: number;
  currentTeacherMembershipId: string | null;
  currentTeacherName: string | null;
};

type TeacherOption = {
  id: string;
  campusId: string;
  name: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="button w-full sm:w-auto" disabled={pending} type="submit">
      {pending && <LoaderCircle className="animate-spin" size={17} />}
      {pending ? "Saving…" : label}
    </button>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  min,
  max,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold text-[#555e69]">
        {label}
      </span>
      <input
        className="h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3 outline-none transition focus:border-[#d71920]"
        max={max}
        min={min}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: Option[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold text-[#555e69]">
        {label}
      </span>
      <select
        className="h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3 outline-none transition focus:border-[#d71920]"
        defaultValue=""
        name={name}
        required
      >
        <option disabled value="">
          Select…
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
}: {
  action: ServerAction;
  label: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form action={formAction} className="space-y-4" ref={formRef}>
      {children}
      <Feedback state={state} />
      <SubmitButton label={label} />
    </form>
  );
}

function FormPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <details className="card group p-4 open:p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-black">
        <span>
          {title}
          <small className="mt-1 block font-medium text-[#7a828d]">
            {description}
          </small>
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#fff0f1] text-[#bd1218]">
          <Plus size={18} />
        </span>
      </summary>
      <div className="mt-5 border-t border-[#e8eaed] pt-5">{children}</div>
    </details>
  );
}

function ClassTeacherForm({
  classArm,
  currentSessionId,
  teachers,
}: {
  classArm: ClassArmOption;
  currentSessionId: string;
  teachers: TeacherOption[];
}) {
  const [state, action, pending] = useActionState(
    assignClassTeacher,
    initialActionState,
  );
  const availableTeachers = teachers.filter(
    (teacher) => teacher.campusId === classArm.campusId,
  );

  return (
    <form action={action} className="rounded-xl border border-[#e3e6ea] p-4">
      <input name="academicSessionId" type="hidden" value={currentSessionId} />
      <input name="campusId" type="hidden" value={classArm.campusId} />
      <input name="classArmId" type="hidden" value={classArm.id} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black">{classArm.label}</h3>
            <span className="pill">
              {classArm.studentCount} student
              {classArm.studentCount === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#747c87]">
            {classArm.campusName} · {classArm.currentTeacherName
              ? `Current class teacher: ${classArm.currentTeacherName}`
              : "No class teacher assigned"}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto]">
          <select
            className="h-11 rounded-xl border border-[#dfe2e6] bg-white px-3 font-bold outline-none focus:border-[#d71920]"
            defaultValue={classArm.currentTeacherMembershipId ?? ""}
            name="teacherMembershipId"
            required
          >
            <option disabled value="">
              Select class teacher…
            </option>
            {availableTeachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
          <button className="button" disabled={pending} type="submit">
            {pending
              ? "Saving…"
              : classArm.currentTeacherMembershipId
                ? "Replace teacher"
                : "Assign teacher"}
          </button>
        </div>
      </div>
      <div className="mt-3">
        <Feedback state={state} />
      </div>
      {!availableTeachers.length && (
        <p className="mt-3 text-xs font-bold text-[#a80f15]">
          Add an active teacher account for this campus before assigning a class
          teacher.
        </p>
      )}
    </form>
  );
}

export function CampusCreateForm() {
  return (
    <FormPanel description="Owner-only school expansion" title="Add a campus">
      <ActionForm action={createCampus} label="Create campus">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Campus name" name="name" placeholder="Nnewi Campus" />
          <Field label="Campus code" name="code" placeholder="NNE" />
          <Field label="City" name="city" placeholder="Nnewi" />
        </div>
      </ActionForm>
    </FormPanel>
  );
}

export function AcademicSetupForms({
  canManageSchool,
  canManageAcademics,
  campuses,
  sessions,
  currentSession,
  classArms,
  teachers,
}: {
  canManageSchool: boolean;
  canManageAcademics: boolean;
  campuses: Array<{ id: string; name: string }>;
  sessions: Array<{ id: string; name: string }>;
  currentSession: { id: string; name: string } | null;
  classArms: ClassArmOption[];
  teachers: TeacherOption[];
}) {
  if (!canManageSchool && !canManageAcademics) return null;

  const campusOptions = campuses.map((campus) => ({
    value: campus.id,
    label: campus.name,
  }));
  const sessionOptions = sessions.map((session) => ({
    value: session.id,
    label: session.name,
  }));

  return (
    <>
      {canManageAcademics && (
        <section className="card mt-5 overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[#e8eaed] p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-[#fff0f1] text-[#bd1218]">
              <UsersRound size={20} />
            </span>
            <div>
              <h2 className="font-black">Class teachers</h2>
              <p className="text-xs text-[#747c87]">
                {currentSession
                  ? `${currentSession.name} · one class teacher per arm`
                  : "Set a current academic session before assigning teachers"}
              </p>
            </div>
          </div>
          {currentSession ? (
            <div className="grid gap-3 p-5 xl:grid-cols-2">
              {classArms.map((classArm) => (
                <ClassTeacherForm
                  classArm={classArm}
                  currentSessionId={currentSession.id}
                  key={classArm.id}
                  teachers={teachers}
                />
              ))}
              {!classArms.length && (
                <div className="empty-state xl:col-span-2">
                  Add a class below. Arm A and Arm B will be created automatically.
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              No current academic session is available for class-teacher assignments.
            </div>
          )}
        </section>
      )}

      <section className="mt-5">
        <p className="eyebrow mb-3">Setup actions</p>
        <div className="grid gap-3 xl:grid-cols-2">
          {canManageSchool && (
            <FormPanel
              description="School-wide date range"
              title="Add academic session"
            >
              <ActionForm
                action={createAcademicSession}
                label="Create session"
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field
                    label="Session name"
                    name="name"
                    placeholder="2026/2027"
                  />
                  <Field label="Starts" name="startsOn" type="date" />
                  <Field label="Ends" name="endsOn" type="date" />
                </div>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input name="isCurrent" type="checkbox" value="yes" />
                  Make this the current session
                </label>
              </ActionForm>
            </FormPanel>
          )}

          {canManageAcademics && (
            <>
              <FormPanel
                description="Campus-specific calendar"
                title="Add term"
              >
                <ActionForm action={createTerm} label="Create term">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      label="Academic session"
                      name="academicSessionId"
                      options={sessionOptions}
                    />
                    <SelectField
                      label="Campus"
                      name="campusId"
                      options={campusOptions}
                    />
                    <SelectField
                      label="Term"
                      name="kind"
                      options={[
                        { value: "FIRST", label: "First term" },
                        { value: "SECOND", label: "Second term" },
                        { value: "THIRD", label: "Third term" },
                        { value: "CUSTOM", label: "Custom term" },
                      ]}
                    />
                    <Field
                      label="Display name"
                      name="name"
                      placeholder="First Term"
                    />
                    <Field label="Starts" name="startsOn" type="date" />
                    <Field label="Ends" name="endsOn" type="date" />
                  </div>
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input name="isCurrent" type="checkbox" value="yes" />
                    Make this the current term for the campus
                  </label>
                </ActionForm>
              </FormPanel>

              <FormPanel
                description="Creates Arm A and Arm B automatically"
                title="Add a class"
              >
                <ActionForm
                  action={createClassWithDefaultArms}
                  label="Create class with A & B"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      label="Campus"
                      name="campusId"
                      options={campusOptions}
                    />
                    <Field
                      label="Class name"
                      name="name"
                      placeholder="Primary 1"
                    />
                    <Field
                      label="Class code (optional)"
                      name="code"
                      placeholder="Auto: PRI-1"
                      required={false}
                    />
                    <Field
                      label="Capacity per arm (optional)"
                      max={1000}
                      min={1}
                      name="capacity"
                      placeholder="30"
                      required={false}
                      type="number"
                    />
                  </div>
                  <p className="text-xs text-[#747c87]">
                    Petra creates separate A and B arms for student placement and
                    class-teacher assignment.
                  </p>
                </ActionForm>
              </FormPanel>

              <FormPanel
                description="Creates and enables it at the selected campus"
                title="Add a subject"
              >
                <ActionForm
                  action={createSubjectForCampus}
                  label="Create and enable subject"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      label="Campus"
                      name="campusId"
                      options={campusOptions}
                    />
                    <Field
                      label="Subject name"
                      name="name"
                      placeholder="Mathematics"
                    />
                    <Field
                      label="Subject code (optional)"
                      name="code"
                      placeholder="Auto: MAT"
                      required={false}
                    />
                  </div>
                </ActionForm>
              </FormPanel>
            </>
          )}
        </div>
      </section>
    </>
  );
}
