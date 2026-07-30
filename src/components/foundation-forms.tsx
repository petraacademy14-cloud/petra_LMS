"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, Plus } from "lucide-react";
import {
  createAcademicSession,
  createCampus,
  createClassArm,
  createClassLevel,
  createSubject,
  createTerm,
  enableSubjectAtCampus,
  initialActionState,
  type ActionState,
} from "@/app/actions/foundation";

type ServerAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

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
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
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
        required
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
  options: Array<{ value: string; label: string }>;
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
      {state.message && (
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
      )}
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

export function CampusCreateForm() {
  return (
    <FormPanel
      description="Owner-only school expansion"
      title="Add a campus"
    >
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
  classLevels,
  subjects,
}: {
  canManageSchool: boolean;
  canManageAcademics: boolean;
  campuses: Array<{ id: string; name: string }>;
  sessions: Array<{ id: string; name: string }>;
  classLevels: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; name: string }>;
}) {
  if (!canManageSchool && !canManageAcademics) return null;

  const campusOptions = campuses.map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const sessionOptions = sessions.map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const levelOptions = classLevels.map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const subjectOptions = subjects.map((item) => ({
    value: item.id,
    label: item.name,
  }));

  return (
    <section className="mt-5">
      <p className="eyebrow mb-3">Setup actions</p>
      <div className="grid gap-3 xl:grid-cols-2">
        {canManageSchool && (
          <>
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

            <FormPanel
              description="Reusable across campuses"
              title="Add class level"
            >
              <ActionForm action={createClassLevel} label="Create class level">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field
                    label="Level name"
                    name="name"
                    placeholder="Primary 1"
                  />
                  <Field label="Code" name="code" placeholder="PRI-1" />
                  <Field
                    label="Sort order"
                    max={100}
                    min={1}
                    name="sortOrder"
                    type="number"
                  />
                </div>
              </ActionForm>
            </FormPanel>

            <FormPanel
              description="School-wide catalogue"
              title="Add subject"
            >
              <ActionForm action={createSubject} label="Create subject">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Subject name"
                    name="name"
                    placeholder="Mathematics"
                  />
                  <Field label="Code" name="code" placeholder="MATH" />
                </div>
              </ActionForm>
            </FormPanel>
          </>
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
              description="Class level within a campus"
              title="Add class arm"
            >
              <ActionForm action={createClassArm} label="Create class arm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="Campus"
                    name="campusId"
                    options={campusOptions}
                  />
                  <SelectField
                    label="Class level"
                    name="classLevelId"
                    options={levelOptions}
                  />
                  <Field label="Arm name" name="name" placeholder="Diamond" />
                  <Field label="Code" name="code" placeholder="DIA" />
                  <Field
                    label="Capacity"
                    max={1000}
                    min={1}
                    name="capacity"
                    type="number"
                  />
                </div>
              </ActionForm>
            </FormPanel>

            <FormPanel
              description="Offer a catalogue subject at a campus"
              title="Enable subject"
            >
              <ActionForm
                action={enableSubjectAtCampus}
                label="Enable subject"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="Campus"
                    name="campusId"
                    options={campusOptions}
                  />
                  <SelectField
                    label="Subject"
                    name="subjectId"
                    options={subjectOptions}
                  />
                </div>
              </ActionForm>
            </FormPanel>
          </>
        )}
      </div>
    </section>
  );
}
