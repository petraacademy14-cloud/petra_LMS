import { createHash } from "node:crypto";

export const examPaperStatuses = ["DRAFT", "PUBLISHED", "CLOSED"] as const;
export const applicantExamStatuses = [
  "SCHEDULED",
  "IN_PROGRESS",
  "SCORED",
  "ABSENT",
  "CANCELLED",
] as const;
export const answerOptions = ["A", "B", "C", "D"] as const;
export const attendanceStatuses = ["PRESENT", "ABSENT"] as const;

export type ExamPaperStatus = (typeof examPaperStatuses)[number];
export type ApplicantExamStatus = (typeof applicantExamStatuses)[number];
export type AnswerOption = (typeof answerOptions)[number];
export type AttendanceStatus = (typeof attendanceStatuses)[number];

export type ObjectiveQuestion = {
  id: string;
  correctOption: AnswerOption;
  marks: number;
};

export function examLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function deterministicQuestionOrder<T extends { id: string }>(
  registrationId: string,
  questions: readonly T[],
) {
  return [...questions].sort((left, right) => {
    const leftRank = createHash("sha256")
      .update(`${registrationId}:${left.id}`)
      .digest("hex");
    const rightRank = createHash("sha256")
      .update(`${registrationId}:${right.id}`)
      .digest("hex");
    return leftRank.localeCompare(rightRank);
  });
}

export function selectAssignedQuestions<T extends { id: string }>(
  registrationId: string,
  questions: readonly T[],
  questionCount: number,
) {
  return deterministicQuestionOrder(registrationId, questions).slice(0, questionCount);
}

export function examDeadline(
  startedAt: Date,
  durationMinutes: number,
  closesAt: Date | null,
) {
  const durationDeadline = new Date(startedAt.getTime() + durationMinutes * 60_000);
  if (!closesAt) return durationDeadline;
  return durationDeadline < closesAt ? durationDeadline : closesAt;
}

export function canStartOnlineExam(input: {
  paperStatus: ExamPaperStatus;
  registrationStatus: ApplicantExamStatus;
  opensAt: Date | null;
  closesAt: Date | null;
  now: Date;
}) {
  return (
    input.paperStatus === "PUBLISHED" &&
    input.registrationStatus === "SCHEDULED" &&
    Boolean(input.opensAt && input.closesAt) &&
    input.now >= (input.opensAt as Date) &&
    input.now < (input.closesAt as Date)
  );
}

export function scoreObjectiveExam(
  questions: readonly ObjectiveQuestion[],
  selectedAnswers: ReadonlyMap<string, AnswerOption>,
  passMark: number,
) {
  const maximumScore = questions.reduce((sum, question) => sum + question.marks, 0);
  const score = questions.reduce((sum, question) => {
    return sum + (selectedAnswers.get(question.id) === question.correctOption ? question.marks : 0);
  }, 0);
  const percentage = maximumScore > 0 ? Number(((score / maximumScore) * 100).toFixed(2)) : 0;

  return {
    score: Number(score.toFixed(2)),
    maximumScore: Number(maximumScore.toFixed(2)),
    percentage,
    passed: percentage >= passMark,
  };
}

export function scoreManualExam(score: number, maximumScore: number, passMark: number) {
  if (!Number.isFinite(score) || !Number.isFinite(maximumScore)) {
    throw new Error("INVALID:EXAM_SCORE");
  }
  if (maximumScore <= 0 || score < 0 || score > maximumScore) {
    throw new Error("INVALID:EXAM_SCORE");
  }
  const percentage = Number(((score / maximumScore) * 100).toFixed(2));
  return {
    score: Number(score.toFixed(2)),
    maximumScore: Number(maximumScore.toFixed(2)),
    percentage,
    passed: percentage >= passMark,
  };
}
