export type MoneyLike = number | string | { toString(): string };

export const PETRA_RESULT_COMPONENTS = [
  {
    name: "First CAT",
    kind: "CONTINUOUS_ASSESSMENT" as const,
    maxScore: 20,
    weight: 20,
    sortOrder: 1,
  },
  {
    name: "Second CAT",
    kind: "CONTINUOUS_ASSESSMENT" as const,
    maxScore: 20,
    weight: 20,
    sortOrder: 2,
  },
  {
    name: "Examination",
    kind: "EXAM" as const,
    maxScore: 60,
    weight: 60,
    sortOrder: 3,
  },
] as const;

export function resultComponentLabel(input: {
  name: string;
  kind: "CONTINUOUS_ASSESSMENT" | "EXAM";
  sortOrder: number;
}) {
  if (input.kind === "CONTINUOUS_ASSESSMENT" && input.sortOrder === 1) {
    return "First CAT";
  }
  if (input.kind === "CONTINUOUS_ASSESSMENT" && input.sortOrder === 2) {
    return "Second CAT";
  }
  if (input.kind === "EXAM" && input.sortOrder === 3) return "Examination";
  return input.name;
}

function number(value: MoneyLike) {
  const parsed = Number(value.toString());
  if (!Number.isFinite(parsed)) throw new Error("INVALID_NUMBER");
  return parsed;
}

export function weightedScore(input: {
  score: MoneyLike;
  maxScore: MoneyLike;
  weight: MoneyLike;
}) {
  const score = number(input.score);
  const maxScore = number(input.maxScore);
  const weight = number(input.weight);
  if (score < 0 || maxScore <= 0 || score > maxScore || weight <= 0) {
    throw new Error("INVALID_SCORE");
  }
  return Math.round(((score / maxScore) * weight + Number.EPSILON) * 100) / 100;
}

export function totalWeightedScore(
  components: Array<{ score: MoneyLike; maxScore: MoneyLike; weight: MoneyLike }>,
) {
  return (
    Math.round(
      components.reduce((total, component) => total + weightedScore(component), 0) *
        100,
    ) / 100
  );
}

export type GradeBandInput = {
  label: string;
  minScore: MoneyLike;
  maxScore: MoneyLike;
  remark: string;
};

export function resolveGrade(scoreInput: MoneyLike, bands: GradeBandInput[]) {
  const score = number(scoreInput);
  return (
    bands.find(
      (band) => score >= number(band.minScore) && score <= number(band.maxScore),
    ) ?? null
  );
}

export function attendanceSummary(
  statuses: Array<"PRESENT" | "ABSENT" | "LATE" | "EXCUSED">,
) {
  const summary = { present: 0, absent: 0, late: 0, excused: 0, total: statuses.length };
  for (const status of statuses) {
    if (status === "PRESENT") summary.present += 1;
    if (status === "ABSENT") summary.absent += 1;
    if (status === "LATE") summary.late += 1;
    if (status === "EXCUSED") summary.excused += 1;
  }
  return {
    ...summary,
    attendanceRate:
      summary.total === 0
        ? 0
        : Math.round(
            (((summary.present + summary.late + summary.excused) / summary.total) *
              100 +
              Number.EPSILON) *
              100,
          ) / 100,
  };
}

const resultTransitions = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["DRAFT", "APPROVED"],
  APPROVED: ["PUBLISHED"],
  PUBLISHED: ["LOCKED"],
  LOCKED: [],
} as const;

export function canTransitionResult(
  current: keyof typeof resultTransitions,
  next: string,
) {
  return (resultTransitions[current] as readonly string[]).includes(next);
}
