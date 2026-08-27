"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import {
  acknowledgeStudentFeedback,
  type ParentFeedbackActionState,
} from "@/app/actions/student-feedback";

const initialState: ParentFeedbackActionState = {
  status: "idle",
  message: "",
};

export function ParentFeedbackResponseForm({
  feedbackId,
  existingComment,
  acknowledged,
}: {
  feedbackId: string;
  existingComment: string | null;
  acknowledged: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    acknowledgeStudentFeedback,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state.status]);

  return (
    <form action={action} className="mt-5 rounded-2xl bg-[#f6f7f8] p-4">
      <input name="feedbackId" type="hidden" value={feedbackId} />
      <label className="block text-sm font-extrabold">
        Parent&apos;s comment
        <textarea
          className="mt-2 min-h-24 w-full rounded-xl border border-[#dfe2e6] bg-white p-3 font-medium outline-none focus:border-[#d71920]"
          defaultValue={existingComment ?? ""}
          maxLength={1500}
          name="parentComment"
          placeholder="Acknowledge the report, ask a question or add a note from home."
        />
      </label>
      {state.status !== "idle" && (
        <p
          aria-live="polite"
          className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${
            state.status === "success"
              ? "bg-[#effaf2] text-[#176b35]"
              : "bg-[#fff1f2] text-[#a20e14]"
          }`}
        >
          {state.message}
        </p>
      )}
      <button className="button mt-3" disabled={pending} type="submit">
        {pending ? (
          <LoaderCircle className="animate-spin" size={17} />
        ) : acknowledged ? (
          <CheckCircle2 size={17} />
        ) : (
          <Send size={17} />
        )}
        {pending
          ? "Sending…"
          : acknowledged
            ? "Update acknowledgement"
            : "Acknowledge and send"}
      </button>
    </form>
  );
}
