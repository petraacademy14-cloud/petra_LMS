# Phase 6B.2 — Detailed parent portal

## Product boundary

Petra Academy creates every parent account and sends the issued username and temporary password to the family. Parents do not self-register.

This slice builds on the secure guardian-to-student links introduced in Phase 6B.1. Every page and download verifies the signed-in parent account, school scope and guardian/student relationship again on the server.

## Parent overview

The parent landing page shows:

- all students linked to the guardian record;
- each student's admission number, campus and current class;
- each student's outstanding fee balance;
- a direct link to the detailed child record;
- the combined balance across linked children.

A guardian with multiple children can switch by returning to the overview. No unlinked student identifier can be opened successfully.

## Detailed child record

### Profile and placement

- official student name and admission number;
- campus and current class arm;
- academic session;
- date of birth and admission date;
- student-record status.

### Fees and receipts

- immutable fee-ledger statement;
- term and academic-session context;
- current outstanding balance;
- posted and reversed payment status;
- receipt number, method, date and amount;
- private PDF receipt download.

The parent portal is read-only. Charges, payments, reversals and reconciliation remain staff workflows.

### Attendance

- current-term submitted or locked attendance only;
- attendance rate and status counts;
- daily attendance history and notes;
- no draft register is exposed.

### Results and report cards

- published or locked subject results only;
- weighted total, grade and remark;
- teacher or admin comment;
- one private PDF report-card download per published term;
- no draft, submitted or merely approved result is exposed.

### Announcements

Parents see only published, parent-facing notices that apply to the child:

- whole-school notices;
- notices for the child's campus;
- notices for the child's current class arm;
- scheduled notices only after their release time.

## Private downloads

Parent-specific route handlers protect receipt and report-card PDFs. A valid parent session is not sufficient by itself: the route also confirms that the requested payment or student belongs to a student linked to the signed-in guardian.

Downloads use `Cache-Control: private, no-store`.

## Verification

1. Sign in as a parent with one linked child.
2. Confirm the overview and child details show that child only.
3. Sign in as a parent with multiple linked children and switch between them.
4. Attempt to open another student's child URL and confirm a not-found response.
5. Confirm the fee statement balance matches the staff fee ledger.
6. Download a posted receipt and confirm the student and receipt number.
7. Confirm a reversed payment remains visible as reversed.
8. Confirm only submitted or locked attendance appears.
9. Confirm only published or locked results appear.
10. Download a report card for a published term.
11. Confirm school, campus and class announcements follow the child's scope.
12. Check the overview, child page, tables and downloads at 360px Android and desktop widths.

## Next slices

- Phase 6B.3: detailed student portal.
- Phase 6B.4: assignment-focused teacher workflow refinements.
- Final integration: merge the stacked Phase 6 branches, run pilot accounts, test cross-family isolation and complete launch readiness.
