# School report PDF builder

Uses the supplied Nursery Termly Report and Senior Secondary Termly Report Sheet. Nursery keeps a centered crest and conduct/traits/activities fields; secondary keeps the red College heading and grade column. Both include CAT1 /20, CAT2 /20, exam /60, total, class highest/lowest, attendance, overall teacher/principal comments, and spaces for signatures and dates. Subjects come from actual published results, not the sample's fixed subject list. Published subjects are counted in the footer; a partial report is not a claim that every subject is complete.

Owner/Admin: Results → Report cards → student → School report PDF builder. Save comments and next-term date, then Download PDF or Open PDF to print. Parents and students download the same renderer through their existing authorized endpoints. Only published/locked results and submitted/locked attendance are included. Signature names are text; the PDF leaves handwritten signature spaces, with no invented signatures.

AUTO selects nursery for nursery/reception/creche classes and the standard score table otherwise. Explicit format override is available to administrators. Awka addresses come from the school-supplied samples; Nnewi falls back to campus/city until its address is entered. No primary-specific sample was supplied.

## Migration and restore

Migration 20261005193000_report_card_details adds a separate report_card_details table and foreign keys, without modifying marks, result sheets, enrollments, attendance or grading. Prisma migrate deploy applies it on preview builds. Never run db push. Rollback: revert application commit first; retain the new table to preserve saved comments. Before removal, export report_card_details and its related audit events using the normal database backup process. Drop the table only after confirming saved details are no longer needed. Audit logs must remain append-only.

## Verification

- Automated validation and template/PDF pagination checks, plus admin scope, term scope, audit, and stale-tab tests.
- Render nursery with ten subjects and secondary with sixteen; inspect every generated PDF page.
- On preview: open Justice's report; expected 12/12/32, total 56, grade C on secondary style, class high/low based only on complete published scores in the same sheet.
- Save comments, reload and download; check they persist and student/parent PDF matches.
- Open in two tabs; save tab A then attempt tab B: stale-tab feedback, no overwrite.
- Campus admin cannot view/change another campus's report; parent requires guardian link; student requires own student ID.
- Confirm form usability at 360px and desktop. No main merge until approval.
