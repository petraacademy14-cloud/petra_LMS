"use client";

import { useActionState, useMemo, useState } from "react";
import { LoaderCircle, Send, ShieldCheck } from "lucide-react";
import {
  sendStudentFeedback,
  type TeacherFeedbackActionState,
} from "@/app/actions/student-feedback";
import {
  arrivalChoices,
  breakChoices,
  conductChoices,
  feedingChoices,
  healthChoices,
  homeworkChoices,
  participationChoices,
  peerChoices,
  toiletChoices,
  type FeedbackChoice,
} from "@/lib/student-feedback";

type StudentOption = {
  id: string;
  name: string;
  admissionNumber: string;
};

export type FeedbackClassOption = {
  termId: string;
  classArmId: string;
  label: string;
  students: StudentOption[];
};

const initialState: TeacherFeedbackActionState = {
  status: "idle",
  message: "",
};

function FeedbackSelect({
  label,
  name,
  choices,
}: {
  label: string;
  name: string;
  choices: readonly FeedbackChoice[];
}) {
  return (
    <label className="block text-sm font-extrabold">
      {label}
      <select
        className="mt-2 h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3 font-medium outline-none focus:border-[#d71920]"
        defaultValue=""
        name={name}
        required
      >
        <option disabled value="">
          Select one…
        </option>
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function StudentFeedbackForm({
  classes,
  today,
}: {
  classes: FeedbackClassOption[];
  today: string;
}) {
  const [state, action, pending] = useActionState(sendStudentFeedback, initialState);
  const [classKey, setClassKey] = useState(
    classes[0] ? `${classes[0].termId}:${classes[0].classArmId}` : "",
  );
  const selectedClass = useMemo(
    () =>
      classes.find(
        (item) => `${item.termId}:${item.classArmId}` === classKey,
      ) ?? classes[0],
    [classKey, classes],
  );

  return (
    <div className="space-y-5">
      {state.status !== "idle" && (
        <p
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-sm font-bold ${
            state.status === "success"
              ? "border-[#b8dfc5] bg-[#effaf2] text-[#176b35]"
              : "border-[#f2b8bc] bg-[#fff1f2] text-[#a20e14]"
          }`}
        >
          {state.message}
        </p>
      )}

      <form action={action} className="space-y-6">
        <input name="termId" type="hidden" value={selectedClass?.termId ?? ""} />
        <input
          name="classArmId"
          type="hidden"
          value={selectedClass?.classArmId ?? ""}
        />

        <section className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-extrabold">
            Feedback date
            <input
              className="mt-2 h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3 font-medium outline-none focus:border-[#d71920]"
              defaultValue={today}
              max={today}
              name="feedbackDate"
              required
              type="date"
            />
          </label>
          <label className="block text-sm font-extrabold">
            Assigned class
            <select
              className="mt-2 h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3 font-medium outline-none focus:border-[#d71920]"
              onChange={(event) => setClassKey(event.target.value)}
              value={classKey}
            >
              {classes.map((item) => {
                const value = `${item.termId}:${item.classArmId}`;
                return (
                  <option key={value} value={value}>
                    {item.label}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="block text-sm font-extrabold">
            Student
            <select
              className="mt-2 h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3 font-medium outline-none focus:border-[#d71920]"
              key={classKey}
              name="studentId"
              required
            >
              <option value="">Choose student…</option>
              {(selectedClass?.students ?? []).map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} · {student.admissionNumber}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section>
          <div className="mb-4">
            <h3 className="font-black">Daily observation</h3>
            <p className="text-sm text-[#68707d]">
              Choose the single option that best describes what was observed.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FeedbackSelect label="Homework" name="homeworkStatus" choices={homeworkChoices} />
            <FeedbackSelect label="Feeding" name="feedingStatus" choices={feedingChoices} />
            <FeedbackSelect label="Toilet" name="toiletStatus" choices={toiletChoices} />
            <FeedbackSelect
              label="Relationship with classmates"
              name="peerRelationshipStatus"
              choices={peerChoices}
            />
            <FeedbackSelect label="Conduct and mood" name="conductStatus" choices={conductChoices} />
            <FeedbackSelect label="Break time" name="breakTimeStatus" choices={breakChoices} />
            <FeedbackSelect
              label="Class participation"
              name="classParticipationStatus"
              choices={participationChoices}
            />
            <FeedbackSelect label="Health" name="healthStatus" choices={healthChoices} />
            <FeedbackSelect label="Arrival" name="arrivalStatus" choices={arrivalChoices} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <label className="block text-sm font-extrabold">
            Observation note
            <textarea
              className="mt-2 min-h-32 w-full rounded-xl border border-[#dfe2e6] bg-white p-3 font-medium outline-none focus:border-[#d71920]"
              maxLength={1200}
              name="observationNote"
              placeholder="Add the reason for a concern, incident details or anything the parent should know."
            />
          </label>
          <label className="block text-sm font-extrabold">
            Teacher&apos;s comment
            <textarea
              className="mt-2 min-h-32 w-full rounded-xl border border-[#dfe2e6] bg-white p-3 font-medium outline-none focus:border-[#d71920]"
              maxLength={2000}
              name="teacherComment"
              placeholder="A warm summary, progress note or action requested from home."
            />
          </label>
        </section>

        <div className="flex flex-col gap-4 rounded-2xl border border-[#f0d9da] bg-[#fff7f7] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-[#b91118]" size={20} />
            <p className="text-sm leading-6 text-[#68707d]">
              This is private to the linked parent or guardian. The parent can acknowledge it and send a comment back.
            </p>
          </div>
          <button
            className="button shrink-0"
            disabled={pending || !selectedClass?.students.length}
            type="submit"
          >
            {pending ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}
            {pending ? "Sending…" : "Send to parent"}
          </button>
        </div>
      </form>
    </div>
  );
}
