# Phase 6A.4: Entrance examinations

## Scope

This slice moves a fully paid applicant from `AWAITING_EXAMINATION` into a controlled online or onsite assessment and then into admissions review.

### Staff workspace

- Create campus- and class-scoped online or onsite examination papers.
- Configure duration, question count, pass mark, access window, onsite schedule and venue.
- Build a multiple-choice question bank with one correct answer and configurable marks.
- Publish only after the active question bank meets the required candidate question count.
- Lock questions after publication and close completed examination papers.
- Review candidate numbers, attendance, status and results.
- Record onsite attendance and manually enter onsite scores.

### Applicant portal

- Register a paid applicant against the published paper matching campus, class and selected mode.
- Generate a unique candidate number and an onsite seat number.
- Show the online opening/closing window or onsite date, venue and printable slip.
- Start a timed online examination only inside the published window.
- Assign each candidate a stable, randomized subset of the active question bank.
- Auto-submit when the countdown reaches zero.
- Score objective answers automatically without exposing correct answers to the browser.
- Show the candidate's score and pass-mark result after submission.

## Workflow

1. Both entrance charges must be fully verified.
2. The application is moved to `AWAITING_EXAMINATION` by the payments workflow.
3. A published paper must match the application's campus, class and exam mode.
4. Opening the examination portal creates one candidate registration.
5. Online candidates move `SCHEDULED → IN_PROGRESS → SCORED`.
6. Onsite candidates are marked present or absent. Present candidates receive a manual score.
7. A scored or absent candidate moves the application to `UNDER_REVIEW`.
8. Final admission decisions remain controlled by the admissions workflow.

## Security and integrity

- Candidate registration is prohibited before the application reaches the examination stage.
- Database triggers reject school, campus, class and mode mismatches.
- Question banks are locked after publication.
- Candidate question order is deterministic per registration but different across registrations.
- Correct answers are queried only inside server actions and are never rendered in applicant pages.
- Submitted answers and score outcomes are written in one database transaction.
- A candidate cannot reopen a scored examination.
- Onsite score entry requires attendance to be marked present.
- Owners can work across campuses; admins remain limited to their assigned campus.
- All paper, question, registration, start, attendance and score events are audited.

## Database

Migration `20260731193000_phase_6a_entrance_examinations` adds:

- `entrance_exam_papers`
- `entrance_exam_questions`
- `exam_candidate_sequences`
- `applicant_exam_registrations`
- `applicant_exam_answers`

Migration `20260731194000_phase_6a_exam_guard_repair` tightens publication and registration guards.

The corresponding models are declared in `prisma/entrance-exams.prisma` and listed as external in Prisma Config.

## Human acceptance

1. Create an online paper for one campus and class.
2. Confirm publishing fails when the question bank is too small.
3. Add enough questions and publish the paper.
4. Confirm questions can no longer be added or changed after publication.
5. Use a fully paid online applicant and open `/apply/exam`.
6. Confirm a candidate number is generated and the exam cannot start outside its window.
7. Start the exam, answer some questions and verify the timer.
8. Submit and confirm objective scoring and movement to `UNDER_REVIEW`.
9. Create and publish an onsite paper for a second applicant.
10. Download the candidate's PDF examination slip.
11. Mark the candidate present and record a manual score.
12. Mark another candidate absent and confirm the audit record.
13. Verify an admin cannot see or operate another campus's candidates.
14. Check phone and desktop layouts.
15. Run `npm run check` before merge.
