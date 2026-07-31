# Phase 6A.5: Admission decisions and enrolment conversion

## Scope

This slice completes the applicant journey after the entrance examination.

- Admissions staff review exam results and record Accepted, Waitlisted or Rejected outcomes.
- Every decision requires an internal note; a separate family-facing message can be shown in the applicant portal.
- Accepted decisions require a future offer deadline.
- Applicants can download a PDF admission letter and accept or decline the offer.
- Expired, declined and accepted responses remain in the audit history.
- Only an accepted family response can be converted into a student record.
- Conversion creates the student, primary guardian, current enrolment and student fee account in one database transaction.
- Admission numbers continue the existing campus/year sequence.
- Original private admission documents are linked to the converted student without copying or exposing their storage keys.

## Controlled workflow

Final outcomes can no longer be applied through the generic application-status control.

`UNDER_REVIEW → decision record → ACCEPTED | WAITLISTED | REJECTED`

A waitlisted record can later move to Accepted or Rejected. Other final decisions are immutable.

Accepted offers use:

`PENDING → ACCEPTED | DECLINED | EXPIRED`

Student conversion requires:

- decision outcome `ACCEPTED`;
- offer response `ACCEPTED`;
- active class arm matching the application campus and class;
- academic session belonging to the same school;
- no previous conversion for the application.

## Routes

Applicant:

- `/apply/status` — decision, letter and offer response
- `/api/admission-letters/[applicationId]/download` — private PDF admission letter
- `/api/admission-documents/[documentId]/download` — authorized private document download

Staff:

- `/admissions-admin/decisions` — decisions, offer responses and conversion
- `/students/[studentId]/admission-record` — source application, exam and linked documents

## Database

Migration `20260731210000_phase_6a_admission_decisions` adds:

- `admission_decisions`
- `student_admission_document_links`
- `AdmissionDecisionOutcome`
- `AdmissionOfferResponse`

Database triggers enforce decision scope, completed examination requirements, controlled outcome and response transitions, conversion eligibility, application-status synchronization and document-link scope.

## Acceptance checks

1. A draft, payment-stage or examination-stage application cannot receive a final decision.
2. Accepted and waitlisted outcomes require a scored examination.
3. Rejection requires a scored or absent examination record.
4. Accepted decisions require a future offer deadline.
5. The family-facing message is visible; the internal note is not exposed to the applicant.
6. The applicant can download the admission letter only for an active or accepted offer.
7. An offer can be accepted or declined only once.
8. An expired offer cannot be accepted.
9. Only an accepted offer can be converted.
10. Conversion cannot run twice for the same application.
11. The selected arm must match the application campus and class.
12. Conversion creates one student, guardian link, current enrolment and fee account.
13. The admission number follows the existing campus/year sequence.
14. Uploaded admission documents remain private and are linked to the student admission record.
15. Campus admins cannot decide or convert applicants from another campus.
16. Decision, response and conversion actions appear in the audit history.
17. `npm run check` passes before merge.
