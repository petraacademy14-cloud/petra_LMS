CREATE TABLE "report_card_details" (
 "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "campusId" TEXT NOT NULL,
 "studentId" TEXT NOT NULL, "termId" TEXT NOT NULL, "details" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "report_card_details_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "report_card_details_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "report_card_details_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "report_card_details_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "report_card_details_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "report_card_details_studentId_termId_key" ON "report_card_details"("studentId", "termId");
CREATE INDEX "report_card_details_schoolId_campusId_termId_idx" ON "report_card_details"("schoolId", "campusId", "termId");
