type PreviewAccountEnvironment = Record<string, string | undefined>;

function value(environment: PreviewAccountEnvironment, key: string) {
  return environment[key]?.trim() || undefined;
}

export function previewAccountConfig(environment: PreviewAccountEnvironment) {
  const password =
    value(environment, "SEED_PREVIEW_ACCESS_PASSWORD") ??
    value(environment, "SEED_OWNER_PASSWORD");

  if (!password || password.length < 10) {
    throw new Error(
      "SEED_PREVIEW_ACCESS_PASSWORD or SEED_OWNER_PASSWORD must contain at least 10 characters.",
    );
  }

  return {
    password,
    owner: {
      name:
        value(environment, "SEED_PREVIEW_OWNER_NAME") ??
        value(environment, "SEED_OWNER_NAME") ??
        "Preview Test Owner",
      email: (
        value(environment, "SEED_PREVIEW_OWNER_EMAIL") ??
        value(environment, "SEED_OWNER_EMAIL") ??
        "owner.preview@petraacademy.test"
      ).toLowerCase(),
    },
    teacher: {
      name:
        value(environment, "SEED_PREVIEW_TEACHER_NAME") ??
        "Preview Test Teacher",
      email: (
        value(environment, "SEED_PREVIEW_TEACHER_EMAIL") ??
        "teacher.preview@petraacademy.test"
      ).toLowerCase(),
    },
    student: {
      username: (
        value(environment, "SEED_PREVIEW_STUDENT_USERNAME") ??
        "petra-preview-student"
      ).toLowerCase(),
      admissionNumber:
        value(environment, "SEED_PREVIEW_STUDENT_ADMISSION_NUMBER") ??
        "PET/PREVIEW/001",
    },
    parent: {
      username: (
        value(environment, "SEED_PREVIEW_PARENT_USERNAME") ??
        "petra-preview-parent"
      ).toLowerCase(),
      email: (
        value(environment, "SEED_PREVIEW_PARENT_EMAIL") ??
        "parent.preview@petraacademy.test"
      ).toLowerCase(),
      phone:
        value(environment, "SEED_PREVIEW_PARENT_PHONE") ?? "+2348000000001",
    },
  };
}
