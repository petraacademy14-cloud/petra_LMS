# Phase 6B.4 - Teacher workspace completion

## Scope

This slice completes the staff-facing teacher interface on top of the existing attendance, result and communication engines.

Teachers continue to use their Better Auth staff account. They do not receive a parent/student portal account. After login, a teacher is routed to `/teacher`, and the main navigation points to assignment-focused teacher routes.

## Teacher overview

The teacher dashboard shows:

- current or latest teaching assignments;
- active learner counts by assigned class;
- recent class attendance registers;
- result-sheet workflow status;
- teacher-authored communication drafts;
- direct mobile-friendly actions for attendance, results and class notices.

No school structure, student register, finance, admissions, people-management, audit or system settings are exposed through teacher navigation.

## Attendance workspace

Route: `/teacher/attendance`

The teacher selects from exact assigned term/class combinations. Multiple subject assignments for the same term and class are deduplicated into one daily attendance option.

The workspace:

- lists only active learners currently enrolled in the assigned class;
- defaults new entries to Present;
- supports Present, Absent, Late and Excused;
- saves a draft before submission;
- shows recent registers;
- prevents teacher edits after submission;
- leaves correction and permanent locking to administrators.

Existing server controls continue to verify the teacher assignment, campus, term, class and register date.

## Result workspace

Route: `/teacher/results`

The teacher sees only result sheets attached to their own membership.

The workspace:

- lists current or latest assigned class/subject combinations;
- identifies assignments that do not yet have a result sheet;
- creates a sheet using the school default grading scheme;
- shows score-entry progress;
- links to the existing secure score sheet;
- lets teachers save complete scores and submit for approval;
- leaves correction, approval, publication and locking to administrators.

## Class communications

Route: `/teacher/communications`

Teachers can create class notices only for classes assigned to them in the current term.

A dedicated server action:

- requires an active teacher membership;
- requires a current teaching assignment for the chosen class;
- forces CLASS audience and the teacher's campus;
- creates only a DRAFT;
- permits the teacher to submit only their own draft to IN_REVIEW;
- audits creation and submission.

Teachers cannot use the general communication-management actions. `communications.manage` was removed from the teacher permission set. Public website stories, delivery generation, review, publication and archiving remain administrator/owner capabilities.

## Database

No migration is required. This slice uses existing teaching assignments, attendance registers, result sheets, announcements and audit logs.

## Acceptance checks

1. Sign in as a teacher and confirm routing to `/teacher`.
2. Confirm navigation contains only Teacher overview, Attendance, Results and Class communications.
3. Confirm the dashboard shows only the teacher's assignments.
4. Confirm duplicate subject assignments for one class produce one attendance option.
5. Save and submit one attendance register on a 360px Android viewport.
6. Confirm the teacher cannot correct or lock a submitted register.
7. Create a result sheet from an assigned subject.
8. Enter all scores and submit the sheet for approval.
9. Confirm another teacher's result-sheet URL is not available.
10. Draft a notice for an assigned current-term class.
11. Submit the notice for review.
12. Attempt to use an unassigned class identifier and confirm rejection.
13. Confirm the teacher cannot open the general communications management screen.
14. Confirm the teacher cannot create public news or publish announcements.
15. Confirm all teacher mutations appear in audit history.
16. Check teacher overview, attendance, results and communications at phone and desktop widths.

## Next step

Phase 6B is complete after this slice. The next work is integration and launch readiness:

- merge the stacked Phase 6A and 6B pull requests in order;
- deploy all migrations;
- run role-isolation and end-to-end acceptance tests;
- import and verify Petra Academy's real records;
- issue pilot parent and student accounts;
- train staff;
- perform backup-restore and rollback exercises;
- complete owner launch approval.
