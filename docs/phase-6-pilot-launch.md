# Phase 6: Integration, corrections, pilot and launch plan

## Goal

Prove Petra LMS is safe, accurate and usable with the integrated Phase 6 website,
admissions system, role portals and existing school-management workflows before
declaring the MVP launched. A green automated build is necessary but not
sufficient. Launch requires approved website corrections, recorded acceptance
evidence, a tested restore, resolved severe defects and explicit owner approval.

## Integration branch

Use `phase-6/integration` as the single Phase 6 working and Preview branch. It
contains the completed Phase 6A and 6B stack plus the launch-readiness controls.
Do not merge the stacked Phase 6 pull requests independently after this branch is
approved.

All requested public-website corrections must be implemented on the integration
branch before the broader owner-led checklist is completed. Record each
correction in `/launch-readiness` or the linked GitHub correction issue, including
its affected route and resolution evidence.

## Environment preparation

1. Confirm Production and Preview use separate Supabase databases.
2. Keep `BETTER_AUTH_URL` Production-only; Preview uses `VERCEL_URL`.
3. Confirm Production and Preview have the correct `DATABASE_URL`, `DIRECT_URL`,
   `BETTER_AUTH_SECRET`, `SUPABASE_URL` and server-only `SUPABASE_SECRET_KEY`.
4. Confirm Production has `APP_ENV=production` and `ALLOW_SELF_SIGN_UP=false`.
5. Create private Supabase Storage buckets named `student-documents`,
   `communication-media` and `admission-documents` where those uploads are used.
6. Limit Vercel Phase 6 Preview builds to `phase-6/integration` to avoid duplicate
   builds from the old stacked branches.
7. Rotate any credential exposed in screenshots or chat before admitting staff.
8. Take a named Supabase restore point and record its UTC timestamp.
9. Open `/api/health`; require HTTP 200, `status: ok` and
   `database: reachable`.

Never paste passwords, database URLs or server keys into the pilot checklist.

## Pilot participants

- Owner: website approval, final launch approval, school-wide checks and rollback decision.
- Awka admin and Nnewi admin: campus configuration, admissions, students and issues.
- At least two teachers per campus: attendance, results and class communications.
- Cashier/accounts reviewer: fees, payments, receipts, reversals and reconciliation.
- Parent and student testers: portal isolation, downloads and published information.
- Independent reviewer: website copy, permissions, report cards and public pages.

Use training/dummy records until the approved real import step. Remove temporary
`TEST` students before loading production records.

## Acceptance sequence

### 1. Website correction gate

- Review `/`, `/about`, `/programs`, `/admissions`, `/apply`, `/book-visit`,
  `/contact`, `/news` and `/login` on phone and desktop.
- Confirm school name, campus details, telephone numbers, email, social links,
  programmes, admissions wording and calls to action.
- Confirm Petra Academy logo, favicon, red/white/silver palette and image usage.
- Record every requested correction with its route, expected wording or layout,
  and approval evidence.
- Mark the website-corrections checklist item passed only after the owner reviews
  the final Preview deployment.

### 2. Access and scope

- Owner signs in and sees both campuses.
- Each admin sees only the assigned campus.
- Teacher cannot access finance, audit, launch approval or unassigned classes.
- Parent cannot open an unlinked learner record or receipt.
- Student cannot open another learner's record or report card.
- Direct URL attempts outside scope are rejected.
- Public staff registration remains disabled.

### 3. Admissions

- Register a guardian applicant and save a partial application.
- Upload PDF/JPEG/PNG documents and confirm the private download boundary.
- Submit the application and confirm locked fields and status tracking.
- Confirm the examination fee remains hidden until the entrance-form fee is
  fully verified.
- Test transfer, cash, POS and manually confirmed online references, including a
  part payment, receipt and reversal.
- Test one online examination with timing, stable randomisation, auto-submit and
  automatic objective scoring.
- Test one onsite examination slip, attendance record and manual score.
- Record accepted, waitlisted and rejected decisions.
- Download the admission letter and test offer acceptance, decline and expiry.
- Convert one accepted offer and verify student, guardian, enrolment, fee account
  and admission-document links are created once.

### 4. Parent, student and teacher portals

- Issue parent and student credentials from existing records.
- Test first-login password change, reset, suspension, reactivation and lockout.
- Confirm a multi-child parent sees only linked children and correct balances.
- Confirm parent receipt and report-card downloads revalidate the relationship.
- Confirm a student sees only their profile, attendance, published results,
  announcements and fee balance.
- Confirm draft attendance and unpublished results remain private.
- Give Teacher A multiple assignments and Teacher B a separate class.
- Confirm each teacher sees only assigned attendance, results and class notices.
- Confirm submitted attendance and results become read-only to the teacher while
  administrator correction and approval controls remain available.

### 5. Student records

- Download the current import template.
- Import a deliberately invalid file and confirm zero rows are written.
- Import the approved source file; record source count and imported count.
- Sample at least ten students across both campuses.
- Verify multiple guardians, search, filters, lifecycle status and reactivation.
- Promote a small test group and verify old enrolment rows remain.

### 6. Fees and payments

- Configure one class fee and apply it twice; confirm no duplicate charge.
- Record cash, transfer and POS part payments.
- Match printable receipt and PDF to payment history.
- Reverse one payment and confirm the original remains visible and balance returns.
- Reconcile one exact day and one deliberate variance.
- Compare owner dashboard, students owing and date/method collection totals.
- Generate reminder drafts and confirm no message is marked sent.

### 7. Attendance and results

- Assign a teacher and submit a full daily register.
- Confirm present, absent, late and excused totals.
- Correct one submitted entry as admin and inspect correction history.
- Lock the register and verify further edits fail.
- Create CA and examination components and reject an above-maximum score.
- Confirm incomplete sheets cannot submit.
- Complete draft, submission, approval, publication and lock in order.
- Compare score sheet, report-card screen, print and PDF.
- Confirm locked scores cannot change.

### 8. Communications

- Draft school, campus and class announcements.
- Confirm a teacher can draft only for an assigned class and cannot publish.
- Generate WhatsApp/email content and verify it remains a draft.
- Publish news, an event and an achievement.
- Confirm unpublished, future or archived content is not exposed publicly.
- Subscribe the same email twice and confirm only one active subscriber.

### 9. Experience and resilience

- Run the website and core workflows at 360px width on an Android browser.
- Repeat sign-in, student search, admissions, attendance and payment on a
  throttled connection.
- Verify empty, validation and permission errors are understandable.
- Check receipt, admission-letter, exam-slip and report-card printing.
- Verify Preview login, public pages and `/api/health` after redeployment.

## Correction and defect rules

- Critical: data exposure, financial corruption, authentication bypass or total outage.
- High: blocked core workflow, wrong balance/result or campus/family scope failure.
- Medium: material website or workflow correction with a reasonable workaround.
- Low: copy, spacing, alignment or minor usability issue.

Every requested website correction must be reviewed before owner approval.
Critical and high issues must be resolved before launch. Accepted risk requires a
written reason and cannot override unresolved high or critical blockers.

## Backup and rollback exercise

1. Record the production commit and database restore point.
2. Restore the backup into an isolated Supabase project.
3. Deploy migrations to the isolated database.
4. Sample owner, campus, student, applicant, payment, attendance, result,
   communication and portal records.
5. Record recovery point and elapsed restore time.
6. Destroy the isolated restore after sign-off.
7. If launch causes a severe incident, stop data entry, preserve evidence, choose
   the last safe commit and restore point, and let the owner authorize rollback.

Database rollback after staff entry is restore-based. Do not drop phase tables
or rewrite immutable financial and audit history.

## Staff training

Run short role-specific sessions and record attendance:

- Owner: website approval, dashboard, launch gate, audit and rollback.
- Admins: admissions, people, campus scope, attendance corrections, results and communications.
- Teachers: assigned registers, result sheets and class notices.
- Accounts: charges, payments, receipts, reversals and reconciliation.
- Front desk: applicant support, visit bookings and onsite exam slips.

## Launch exit criteria

- GitHub CI, migrations, tests and production build pass on `phase-6/integration`.
- The single Vercel Preview deployment is accessible and healthy.
- All requested website corrections are implemented and owner-reviewed.
- Every automated readiness indicator is green or explicitly understood.
- Every manual checklist item is passed with non-secret evidence.
- No open or in-progress high/critical issue remains.
- Private storage buckets are verified.
- Backup restore exercise is recorded.
- Staff training is complete.
- Owner records final approval in `/launch-readiness`.

After production deployment, run `npm run check:production` and review health,
errors, audit activity, payment reconciliation and backup status daily for the
first week.
