# Phase 6: Pilot and launch plan

## Goal

Prove Petra LMS is safe and usable with real staff workflows before declaring
the MVP launched. A green build is necessary but not sufficient: launch requires
recorded evidence from Awka and Nnewi, a tested restore, resolved severe defects
and explicit owner approval.

## Environment preparation

1. Confirm Production and Preview use separate databases.
2. Keep `BETTER_AUTH_URL` Production-only; Preview uses `VERCEL_URL`.
3. Confirm Production has `DATABASE_URL`, `DIRECT_URL`,
   `BETTER_AUTH_SECRET`, `APP_ENV=production` and
   `ALLOW_SELF_SIGN_UP=false`.
4. Confirm the private `student-documents` and `communication-media` buckets
   exist if uploads will be tested.
5. Rotate any credential exposed in screenshots or chat before admitting staff.
6. Take a named Supabase restore point and record its UTC timestamp.
7. Open `/api/health`; require HTTP 200, `status: ok` and
   `database: reachable`.

Never paste passwords, database URLs or server keys into the pilot checklist.

## Pilot participants

- Owner: final approval, school-wide checks and rollback decision.
- Awka admin and Nnewi admin: campus configuration, students, finance and issues.
- At least two teachers per campus: attendance and result entry.
- Cashier/accounts reviewer: payments, receipts, reversals and reconciliation.
- Independent reviewer: sample data, permissions, report cards and public pages.

Use training/dummy records until the real import step. Remove temporary `TEST`
students before loading the approved source file.

## End-to-end test sequence

### 1. Access and scope

- Owner signs in and sees both campuses.
- Each admin sees only the assigned campus.
- Teacher cannot access finance, audit, approval or launch routes.
- Direct URL attempts outside campus scope are rejected.
- Public registration remains disabled.

### 2. Student records

- Download the current import template.
- Import a deliberately invalid file and confirm zero rows are written.
- Import the approved real file; record source count and imported count.
- Sample at least ten students across both campuses.
- Verify multiple guardians, search, filters, lifecycle status and reactivation.
- Promote a small test group and verify old enrolment rows remain.

### 3. Fees and payments

- Configure one class fee and apply it twice; confirm no duplicate charge.
- Record cash, transfer and POS part payments.
- Match printable receipt and PDF to payment history.
- Reverse one payment and confirm the original remains visible and balance returns.
- Reconcile one exact day and one deliberate variance.
- Compare owner dashboard, students owing and date/method collection totals.
- Generate reminder drafts and confirm no message is marked sent.

### 4. Attendance

- Assign a teacher and submit a full daily register.
- Confirm present, absent, late and excused totals.
- Correct one submitted entry as admin and inspect correction history.
- Lock the register and verify further edits fail.
- Compare learner and class reports with the register.

### 5. Results

- Create CA and examination components and reject an above-maximum score.
- Confirm incomplete sheets cannot submit.
- Complete draft, submission, approval, publication and lock in order.
- Verify teacher comments, grade thresholds and CA/exam weights.
- Compare score sheet, report-card screen, print and PDF.
- Confirm locked scores cannot change.

### 6. Communication

- Draft school, campus and class announcements.
- Confirm a teacher cannot publish.
- Generate WhatsApp/email content and verify it remains a draft.
- Publish news, an event and an achievement.
- Confirm unpublished/archived content is absent from `/updates`.
- Subscribe the same email twice and confirm only one active subscriber.

### 7. Experience and resilience

- Run core workflows at 360px width on an Android browser.
- Repeat sign-in, student search, attendance and payment on a throttled connection.
- Verify empty, validation and permission errors are understandable.
- Check receipt/report-card printing.
- Verify production login, `/updates` and `/api/health` after redeployment.

## Defect rules

- Critical: data exposure, financial corruption, authentication bypass or total outage.
- High: blocked core workflow, wrong balance/result or campus-scope failure.
- Medium: workaround exists but pilot workflow is materially impaired.
- Low: copy, alignment or minor usability issue.

Critical and high issues must be resolved before launch. Accepted risk requires a
written reason; it never overrides the final launch gate for unresolved high or
critical defects.

## Backup and rollback exercise

1. Record the production commit and database restore point.
2. Restore the backup into an isolated Supabase project.
3. deploy migrations to the isolated database.
4. Sample owner, campus, student, payment, attendance, result and communication data.
5. Record recovery point and elapsed restore time.
6. Destroy the isolated restore after sign-off.
7. If launch causes a severe incident, stop data entry, preserve evidence, choose
   the last safe commit and restore point, and let the owner authorize rollback.

Database rollback after staff entry is restore-based. Do not drop Phase tables or
rewrite immutable financial/audit history.

## Staff training

Run short role-specific sessions and record attendance:

- Owner: dashboard, approvals, audit, launch and rollback.
- Admins: people, campus scope, attendance corrections, results and communications.
- Teachers: assigned registers and result sheets.
- Accounts: charges, payments, receipts, reversals and reconciliation.

## Launch exit criteria

- CI, migration, tests and production build pass.
- Production health endpoint is green.
- Every automated readiness indicator is green or explicitly understood.
- All 20 manual checklist items are PASSED with non-secret evidence.
- No open/in-progress high or critical issue remains.
- Backup restore exercise is recorded.
- Staff training is complete.
- Owner records final approval in `/launch-readiness`.

After launch, review health, errors, audit activity, payment reconciliation and
backup status daily for the first week.
