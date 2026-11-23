BEGIN;
CREATE TYPE "AcademicPathway" AS ENUM ('SCIENCE', 'ARTS', 'COMMERCIAL');
ALTER TABLE "enrollments" ADD COLUMN "academicPathway" "AcademicPathway";
CREATE TABLE "curriculum_offerings" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "campusId" TEXT NOT NULL,
 "termId" TEXT NOT NULL,
 "classArmId" TEXT NOT NULL,
 "subjectId" TEXT NOT NULL,
 "displayName" TEXT NOT NULL,
 "groupName" TEXT,
 "sortOrder" INTEGER NOT NULL DEFAULT 0,
 "pathway" "AcademicPathway",
 "isRequired" BOOLEAN NOT NULL DEFAULT false,
 "isActive" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("classArmId") REFERENCES "class_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "curriculum_offerings_termId_classArmId_subjectId_key" ON "curriculum_offerings"("termId","classArmId","subjectId");
CREATE INDEX "curriculum_offerings_campusId_termId_classArmId_idx" ON "curriculum_offerings"("campusId","termId","classArmId");
CREATE TABLE "student_subject_selections" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "campusId" TEXT NOT NULL,
 "enrollmentId" TEXT NOT NULL,
 "offeringId" TEXT NOT NULL,
 "isActive" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("offeringId") REFERENCES "curriculum_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "student_subject_selections_enrollmentId_offeringId_key" ON "student_subject_selections"("enrollmentId","offeringId");
CREATE INDEX "student_subject_selections_campusId_offeringId_isActive_idx" ON "student_subject_selections"("campusId","offeringId","isActive");
COMMIT;
