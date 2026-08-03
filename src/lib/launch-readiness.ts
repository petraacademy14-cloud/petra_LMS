export const defaultPilotChecklist = [
  ["website-copy", "Website", "Approved website copy, contact details and campus information are correct"],
  ["website-brand", "Website", "Logo, colours, favicon, navigation and mobile layouts match Petra Academy branding"],
  ["website-corrections", "Website", "All requested website corrections are implemented and owner-reviewed"],
  ["access-owner", "Access", "Owner can sign in and access both campuses"],
  ["access-admin", "Access", "Campus admins cannot access the other campus"],
  ["access-teacher", "Access", "Teachers can access only assigned teaching workflows"],
  ["admissions-application", "Admissions", "Applicant registration, saved draft, upload and submission complete successfully"],
  ["admissions-fees", "Admissions", "Examination fee remains hidden until the form fee is fully verified"],
  ["admissions-exam-online", "Admissions", "Online examination timing, randomisation, submission and scoring are verified"],
  ["admissions-exam-onsite", "Admissions", "Onsite slip, attendance and manual scoring are verified"],
  ["admissions-decision", "Admissions", "Decision, admission letter, offer response and student conversion are verified"],
  ["portal-parent", "Portals", "Parent accounts show only linked children, receipts, attendance and published results"],
  ["portal-student", "Portals", "Student accounts show only the linked learner and authorised downloads"],
  ["portal-teacher", "Portals", "Teacher workspace is limited to assigned classes and subjects"],
  ["students-import", "Students", "Student import validates and completes with the exact approved row count"],
  ["students-sample", "Students", "Ten sampled student and guardian records match the approved source"],
  ["students-promotion", "Students", "Promotion preserves prior enrolment history"],
  ["finance-fees", "Finance", "Fee structures create the correct charges without duplicates"],
  ["finance-payment", "Finance", "Part payment updates balance and produces matching receipt and PDF"],
  ["finance-reversal", "Finance", "Reversal restores balance without editing the original transaction"],
  ["finance-reconcile", "Finance", "Daily cash, transfer and POS totals reconcile"],
  ["attendance-register", "Attendance", "Teacher submits an assigned class register"],
  ["attendance-correction", "Attendance", "Admin correction records before, after and reason"],
  ["results-workflow", "Results", "Scores pass draft, approval, publication and lock in order"],
  ["results-report", "Results", "Published report card matches scores, grades and attendance"],
  ["communications", "Communications", "Announcement and public story require approval before publication"],
  ["permissions", "Security", "Owner, admin, teacher, parent and student permission boundaries are sampled"],
  ["mobile", "Experience", "Website and core workflows pass on a 360px Android viewport"],
  ["low-data", "Experience", "Core pages remain usable on a slow connection"],
  ["storage", "Operations", "Private student, communication and admission storage buckets are verified"],
  ["backup", "Operations", "Supabase backup and isolated restore are verified"],
  ["rollback", "Operations", "Rollback owner, decision point and restore procedure are recorded"],
  ["training", "People", "Owner, admins, teachers and cashier complete workflow training"],
] as const;

export type LaunchChecklistInput = {
  status: "NOT_STARTED" | "IN_PROGRESS" | "PASSED" | "FAILED" | "BLOCKED";
  label: string;
};

export type LaunchIssueInput = {
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "ACCEPTED_RISK";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
};

export function launchBlockers(
  checklist: LaunchChecklistInput[],
  issues: LaunchIssueInput[],
) {
  const blockers = checklist
    .filter((item) => item.status !== "PASSED")
    .map((item) => `Checklist: ${item.label} (${item.status})`);

  blockers.push(
    ...issues
      .filter(
        (item) =>
          ["OPEN", "IN_PROGRESS"].includes(item.status) &&
          ["HIGH", "CRITICAL"].includes(item.severity),
      )
      .map((item) => `Issue: ${item.title} (${item.severity})`),
  );

  return blockers;
}
