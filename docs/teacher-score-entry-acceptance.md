# Teacher score entry

Teachers choose an assigned class, term and subject in Results, then enter CAT 1,
CAT 2 and Examination beside each active student. Opening a subject reuses its
existing sheet or creates one with Petra's 20/20/60 components automatically.

## Safeguards

- Server actions enforce school, campus, teacher ownership and current assignment.
- Rosters are restricted to the result term's academic session and active enrolments.
- CAT entries are 0–20; exams are 0–60, with at most two decimal places.
- Blank scores preserve existing records. Zero is a recorded score. Omitted
  comments preserve comments; explicitly clearing a comment removes it.
- Any invalid field rolls back the entire save.
- Row locks coordinate draft saving, submission, approval and score correction.
- The saved sheet timestamp rejects an outdated browser tab before any score writes.
- Save and submit writes scores and checks completeness in the same transaction.
  An incomplete submission rolls back all edits in that attempt; Save draft allows
  partial work. Empty classes cannot submit.
- Submitted, approved, published and locked scores are read-only for teachers.
- Creation is serialized by term/class/subject; the existing database uniqueness
  constraint provides additional protection against duplicates.
- The existing administrator approval, publication, correction audit trail and
  report-card tables and calculations remain in use. No schema migration.

## Preview acceptance (teacher and administrator)

1. Open Results with the preview teacher. Choose Nursery 1 A and an assigned subject.
2. Confirm one row per active learner, the correct subject/term and 20/20/60 limits.
3. Enter 20/20/60 and confirm total 100; change CAT to 21 or exam to 61 and confirm
   the browser prevents saving. Check server tests also reject bypassed limits.
4. Save CAT 1 alone, refresh/reopen the subject and verify the recorded score.
5. Leave a saved field blank and save: the recorded score must remain. Enter 0
   and save: zero must persist and count toward completion.
6. Open the same subject in two tabs. Save in tab A; attempt a different save in
   tab B. Tab B must explain that results changed and leave A's records intact.
7. Submit an incomplete subject: show a clear error and preserve previously saved
   records. Complete all three scores and use Save and submit for approval.
8. Confirm the teacher cannot edit after submission. An administrator can return
   to draft, approve, publish and use the existing audited correction workflow.
9. Double-click/reopen Open scores: confirm a single underlying result sheet.
10. Check 360px and desktop display, clear error/success feedback and horizontal
    scrolling within the score table.
11. After publication, compare the report-card page/PDF with saved subject scores
    and confirm unpublished drafts are absent from parent/student reports.

Automated action tests mock database transactions and cover rollback, scope,
blank/zero semantics, stale tabs, submission states and reuse. They do not prove
PostgreSQL concurrency in a live deployment; verify steps 6 and 9 in Preview.
Production merging requires the user's approval after preview review.
