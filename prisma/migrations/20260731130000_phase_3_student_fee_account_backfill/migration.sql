-- Backfill the finance projection for students created before Phase 3 integration.
-- This migration is idempotent so preview and production can be reconciled safely.
INSERT INTO "student_fee_accounts" (
  "id",
  "schoolId",
  "campusId",
  "studentId",
  "admissionNumber",
  "displayName",
  "classArmId",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'sfa_' || md5(student."id"),
  student."schoolId",
  student."campusId",
  student."id",
  student."admissionNumber",
  trim(concat_ws(' ', student."firstName", student."middleName", student."lastName")),
  current_enrollment."classArmId",
  student."status" = 'ACTIVE'::"StudentStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "students" AS student
LEFT JOIN LATERAL (
  SELECT enrollment."classArmId"
  FROM "enrollments" AS enrollment
  WHERE enrollment."studentId" = student."id"
    AND enrollment."status" = 'CURRENT'::"EnrollmentStatus"
  ORDER BY enrollment."startsOn" DESC, enrollment."createdAt" DESC
  LIMIT 1
) AS current_enrollment ON true
ON CONFLICT ("schoolId", "studentId") DO UPDATE SET
  "campusId" = EXCLUDED."campusId",
  "admissionNumber" = EXCLUDED."admissionNumber",
  "displayName" = EXCLUDED."displayName",
  "classArmId" = EXCLUDED."classArmId",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;
