export const defaultPilotChecklist = [
  ["access-owner", "Access", "Owner can sign in and access both campuses"],
  ["access-admin", "Access", "Campus admins cannot access the other campus"],
  ["students-import", "Students", "Real student import validates and completes with exact row count"],
  ["students-sample", "Students", "Ten sampled student and guardian records match the source"],
  ["students-promotion", "Students", "Promotion preserves prior enrolment history"],
  ["finance-fees", "Finance", "Fee structures create the correct charges without duplicates"],
  ["finance-payment", "Finance", "Part payment updates balance and produces matching receipt/PDF"],
  ["finance-reversal", "Finance", "Reversal restores balance without editing the original transaction"],
  ["finance-reconcile", "Finance", "Daily cash, transfer and POS totals reconcile"],
  ["attendance-register", "Attendance", "Teacher submits an assigned class register"],
  ["attendance-correction", "Attendance", "Admin correction records before, after and reason"],
  ["results-workflow", "Results", "Scores pass draft, approval, publication and lock in order"],
  ["results-report", "Results", "Published report card matches scores, grades and attendance"],
  ["communications", "Communications", "Announcement and public story require approval before publication"],
  ["permissions", "Security", "Owner, admin and teacher permission boundaries are sampled"],
  ["mobile", "Experience", "Core workflows pass on a narrow Android viewport"],
  ["low-data", "Experience", "Core pages remain usable on a slow connection"],
  ["backup", "Operations", "Supabase backup and isolated restore are verified"],
  ["rollback", "Operations", "Rollback owner, decision point and restore procedure are recorded"],
  ["training", "People", "Owner, admins, teachers and cashier complete workflow training"],
] as const;

export type LaunchChecklistInput = { status: "NOT_STARTED" | "IN_PROGRESS" | "PASSED" | "FAILED" | "BLOCKED"; label: string };
export type LaunchIssueInput = { status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "ACCEPTED_RISK"; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; title: string };

export function launchBlockers(checklist: LaunchChecklistInput[], issues: LaunchIssueInput[]) {
  const blockers = checklist.filter((item) => item.status !== "PASSED").map((item) => `Checklist: ${item.label} (${item.status})`);
  blockers.push(...issues.filter((item) => ["OPEN","IN_PROGRESS"].includes(item.status) && ["HIGH","CRITICAL"].includes(item.severity)).map((item) => `Issue: ${item.title} (${item.severity})`));
  return blockers;
}
