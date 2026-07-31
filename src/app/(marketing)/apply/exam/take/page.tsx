import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { submitApplicantExam } from "@/app/actions/entrance-exams";
import { ExamTimer } from "@/components/exam-timer";
import { requireApplicant } from "@/lib/applicant-auth";
import { db } from "@/lib/db";
import { selectAssignedQuestions } from "@/lib/entrance-exam";

export const metadata: Metadata = { title: "Take entrance examination" };

type RegistrationRow = {
  id: string;
  status: string;
  paperId: string;
  title: string;
  instructions: string;
  questionCount: number;
  expiresAt: Date | null;
  candidateNumber: string;
};

type QuestionRow = {
  id: string;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

export default async function TakeEntranceExamPage() {
  const viewer = await requireApplicant();
  const registrations = await db.$queryRaw<RegistrationRow[]>`
    SELECT r."id", r."status"::text AS "status", r."paperId", p."title", p."instructions",
      p."questionCount", r."expiresAt", r."candidateNumber"
    FROM "applicant_exam_registrations" r
    JOIN "entrance_exam_papers" p ON p."id" = r."paperId"
    JOIN "admission_applications" a ON a."id" = r."applicationId"
    WHERE r."applicationId" = ${viewer.applicationId} AND a."accountId" = ${viewer.id}
    LIMIT 1
  `;
  const registration = registrations[0];
  if (!registration || registration.status !== "IN_PROGRESS" || !registration.expiresAt) {
    redirect("/apply/exam");
  }

  const questionRows = await db.$queryRaw<QuestionRow[]>`
    SELECT "id", "prompt", "optionA", "optionB", "optionC", "optionD"
    FROM "entrance_exam_questions"
    WHERE "paperId" = ${registration.paperId} AND "isActive" = TRUE
  `;
  const questions = selectAssignedQuestions(registration.id, questionRows, registration.questionCount);
  if (questions.length < registration.questionCount) {
    throw new Error("INCOMPLETE:EXAM_QUESTION_BANK");
  }
  const formId = "online-entrance-exam";

  return (
    <section className="marketing-section exam-taking-section">
      <div className="marketing-shell exam-taking-shell">
        <header className="exam-taking-header">
          <div>
            <span className="section-kicker">Candidate {registration.candidateNumber}</span>
            <h1>{registration.title}</h1>
            <p>{registration.instructions}</p>
          </div>
          <ExamTimer expiresAt={registration.expiresAt.toISOString()} formId={formId} />
        </header>

        <div className="exam-integrity-note">
          <ShieldCheck size={22} />
          <p>Answer every question independently. Your selected answers are scored only after you submit or the timer reaches zero.</p>
        </div>

        <form action={submitApplicantExam} className="exam-question-form" id={formId}>
          {questions.map((question, index) => {
            const options = [
              ["A", question.optionA],
              ["B", question.optionB],
              ["C", question.optionC],
              ["D", question.optionD],
            ] as const;
            return (
              <fieldset className="marketing-card exam-question-card" key={question.id}>
                <legend><span>{index + 1}</span>{question.prompt}</legend>
                <div className="exam-options">
                  {options.map(([value, label]) => (
                    <label key={value}>
                      <input name={`question_${question.id}`} type="radio" value={value} />
                      <span className="exam-option-letter">{value}</span>
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}

          <div className="exam-submit-panel marketing-card">
            <AlertTriangle size={22} />
            <div>
              <strong>Final submission</strong>
              <p>You cannot reopen or change this examination after submission.</p>
            </div>
            <button className="button" type="submit">Submit examination</button>
          </div>
        </form>
      </div>
    </section>
  );
}
