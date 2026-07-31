# Phase 6B.3 - Detailed student portal

## Scope

This slice expands the school-issued student account from a foundation dashboard into a complete read-only academic portal.

Students do not self-register. Petra Academy creates the account from an existing student record and sends the generated credentials to the family. Every page and download is restricted to the one student record linked to that account.

## Student experience

The student dashboard now shows:

- official name, admission number, campus and record status;
- current class and academic session;
- date of birth and admission date;
- current outstanding school-fee balance;
- current-term attendance summary and released daily entries;
- published or locked subject results;
- assessment component scores, weighted total, grade and remark;
- one downloadable report card per published term;
- published school, campus and current-class announcements.

Detailed payment history and official receipt downloads remain in the linked parent portal and finance workspace. The student portal exposes only the current balance.

## Release boundaries

### Attendance

Only attendance registers in `SUBMITTED` or `LOCKED` status are visible. Draft registers remain private to staff.

### Results

Only result sheets in `PUBLISHED` or `LOCKED` status are visible. Draft, submitted and approved-only sheets remain hidden.

A result row is shown only when every configured assessment component has a recorded score for the student.

### Announcements

The student sees only announcements that are:

- `PUBLISHED`;
- marked as family-facing through the existing `parentFacing` release control;
- already released according to `scheduledFor`;
- school-wide, for the student's campus, or for the student's current class.

Internal staff notices remain hidden.

## Private report-card downloads

Route:

`/api/student/report-cards/[studentId]/download?termId=...`

The route:

1. requires an active student portal session;
2. confirms the account is linked to the requested student identifier;
3. confirms the student belongs to the same school;
4. includes only published or locked results;
5. includes only submitted or locked attendance;
6. returns a private, no-store PDF response.

The PDF uses standard embedded fonts and ASCII-safe punctuation to avoid missing-glyph rendering problems.

## Database

No migration is required. The slice reads existing student, enrolment, attendance, result, fee-ledger and announcement records.

## Acceptance checks

1. Sign in with a school-issued student account.
2. Confirm the portal shows only the linked student's record.
3. Confirm the current class, campus and academic session are correct.
4. Confirm draft attendance does not appear.
5. Confirm submitted and locked attendance appears in the current-term summary.
6. Confirm draft, submitted and approved-only results do not appear.
7. Confirm published and locked results show component scores, total, grade and remark.
8. Download one report card and confirm it contains only published data.
9. Change the student identifier in the report-card URL and confirm access is denied.
10. Confirm school announcements are visible.
11. Confirm a different campus or class announcement is hidden.
12. Confirm future-scheduled and internal announcements are hidden.
13. Confirm the displayed fee balance matches the immutable ledger.
14. Check the dashboard at 360px Android width and desktop width.
15. Confirm generated PDFs have no clipped text, broken glyphs or overlapping rows.

## Next slice

Phase 6B.4 completes the assignment-focused teacher workspace for attendance, results and communications, followed by integrated launch testing and pilot preparation.
