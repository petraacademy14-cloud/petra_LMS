# Phase 4: Attendance and results

## Scope

Phase 4 adds daily attendance and academic result processing to Petra Academy's
school-management MVP. It does not add e-learning, online examinations or parent
portal delivery.

## Attendance workflow

- One register exists per class and date.
- Teachers may open and submit registers only for classes in their current
  teaching assignments.
- Statuses are present, absent, late and excused.
- Submitted registers can only be corrected by an owner or campus admin.
- Every correction records the previous value, new value, reason and actor.
- Locked registers reject entry changes at both application and database layers.
- Reports filter by date range, campus and class and calculate learner rates.

## Results workflow

- Owners/admins assign each teacher to a campus, term, class and subject.
- A result sheet contains configurable assessment components. The default is
  two continuous-assessment components and one examination.
- Scores are normalized by component maximum and weight.
- The initial editable grading scheme uses 40% CA and 60% exam with A–F bands.
- Sheets move through draft, submitted, approved, published and locked states.
- Teachers edit only draft sheets assigned to them.
- Owners/admins approve, publish and lock.
- Score corrections before locking require a reason and preserve history.
- Locked sheets reject component, score and result-entry changes in PostgreSQL.

## Report cards

- Only published or locked subject sheets appear.
- Cards show subject totals, configured grades and remarks, teacher comments,
  attendance summary and enrolment/promotion history.
- Cards can be printed or downloaded as PDF.
- Class report lists support opening each published learner report for bulk
  printing.

## Acceptance checks

- A teacher cannot take attendance or enter results outside an assignment.
- Saving a register twice updates the same class/date register.
- Admin corrections preserve before/after values and a reason.
- Locked attendance rejects later edits.
- Scores above a component maximum are rejected.
- Incomplete result sheets cannot be submitted.
- Approval, publication and locking occur in order.
- Locked results reject later score edits.
- Grade thresholds and CA/exam weights are configurable and total 100%.
- Published report cards match the score sheet and attendance report.
- `npm run check` passes before merge.
