export type TeacherAssignmentKey = {
  termId: string;
  classArmId: string;
};

export function teachingClassKey(input: TeacherAssignmentKey) {
  return `${input.termId}:${input.classArmId}`;
}

export function uniqueTeachingClasses<T extends TeacherAssignmentKey>(
  assignments: T[],
) {
  const unique = new Map<string, T>();
  for (const assignment of assignments) {
    const key = teachingClassKey(assignment);
    if (!unique.has(key)) unique.set(key, assignment);
  }
  return [...unique.values()];
}

export function lagosDateInput(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function resultProgress(input: {
  componentCount: number;
  studentCount: number;
  scoreCount: number;
}) {
  const expected = input.componentCount * input.studentCount;
  return {
    expected,
    recorded: input.scoreCount,
    percent:
      expected === 0
        ? 0
        : Math.min(100, Math.round((input.scoreCount / expected) * 100)),
    complete: expected > 0 && input.scoreCount === expected,
  };
}

export function teacherStatusTone(status: string) {
  if (
    ["SUBMITTED", "APPROVED", "PUBLISHED", "LOCKED", "IN_REVIEW"].includes(
      status,
    )
  ) {
    return "success" as const;
  }
  if (["DRAFT", "NEW"].includes(status)) return "brand" as const;
  return undefined;
}
