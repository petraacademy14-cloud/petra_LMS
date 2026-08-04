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
  help,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  required?: boolean;
  help?: string;
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
      {help && <span className="mt-1 block text-xs text-[#7a828d]">-none transition focus:border-[#d71920]"
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
}: = useActionState(action, initialActionState);
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
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 fontdetails className="card group p-4 open:p-5">
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
      <div className="mt-5 border-t border-[#e8eaed] pt-5">{children  classArmId,
  currentTeacherMembershipId,
  teachers,
}: {
  campusId: string;
  academicSessionId: string;
  classArmId: string;
  currentTeacherMembershipId: string | null;
  teachers: Option[];
}) {
  const [state, action] = useActionState(assignClassTeacher, initialActionState);
  return (
    <form action={action} className="mt-3teacher) => teacher.campusId === classArm.campusId,
  );

  return (
    <form action={action} className="rounded-xl border border-[#e3e6ea] p-4">
      <input name="academicSessionId" type="hidden" value={currentSession.id} />
      <input name="campusId" type="hidden" value={classArm.campusId} />
      <input name="classArmId" type="hidden" value={classArm.id} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black">{classArm.label}</h3>
            <span className="pill">{classArm.studentCount} students</span>
          </div>
          <p className="mt-1 text-xs text-[#747c87]">
            {classArm.teacherName
              ? `Current class teacher: ${classArm.teacherName}`
              : "No class teacher assigned"}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto]">
          <select
            className="h-11 rounded-xl border border-[#dfe2e6] bg-white px-3 font-bold outline-none focus:border-[#d71920]"
            defaultValue={classArm.teacherMembershipId ?? ""}
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
              : classArm.teacherMembershipId
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
 (
            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
              {classArms.map((arm) => {
                const teacherOptions = teachers
                  .filter((teacher) => teacher.campusId === arm.campusId)
                  .map((teacher) => ({ value: teacher.id, label: teacher.name }));
                return (
                  <article
                    className="rounded-2xl border border-[#e4e7eb] p-4"
                    key={arm.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{arm.label}</p>
                        <p className="mt-1 text-xs text-[#747c87]">
                          {arm.campusName} · {arm.studentCount} active student
                          {arm.studentCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span
                        className="pill"
                        data-tone={arm.currentTeacherName ? "success" : undefined}
                      >
                        {arm.currentTeacherName ?? "Unassigned"}
                      </span>
                    </div>
                    {teacherOptions.length ? (
                      <ClassTeacherForm
                        academicSessionId={currentSession.id}
                        campusId={arm.campusId}
                        classArmId={arm.id}
                        currentTeacherMembershipId={
                          arm.currentTeacherMembershipId
                        }
                        teachers={teacherOptions}
                      />
                    ) : (
                      <p className="mt-4 rounded-xl bg-[#fff7e8] p-3 text-xs font-bold text-[#8a5708]">
                        Add an active teacher to this campus before assigning a
                        class teacher.
                      </p>
                    )}
                  </article>
                );
              })}
              {!classArms.length && (
                <div className="empty-state md:col-span-2 xl:col-span-3">
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
 },
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
                  The class is added once and Petra creates separate A and B arms
                  for student placement and class-teacher assignment.
                </                    />
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
                      help="Optional. A code such as PRI-1 will be generated automatically."
                      label="Class code"
                      name="code"
                      placeholder="PRI-1"
                      required={false}
                    />
                    <Field
                      help="Optional. The same capacity is applied to both arms."
                      label="Capacity per arm"
                      max={1000}
                      min={1}
                      name="capacity"
                      required={false}
                      type="number"
                    />
                  </div>
                </ActionForm>
              </FormPanel>

              <FormPanel
                description="Creates the subject and enables it at the selected campus"
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
                      help="Optional. A short code will be generated from the name."
                      label="Subject code"
                      name="code"
                      placeholder="MATH"
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
