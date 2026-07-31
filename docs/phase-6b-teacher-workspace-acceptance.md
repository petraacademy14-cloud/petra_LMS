# Phase 6B.4 teacher workspace acceptance

## Test accounts

Prepare one owner, one campus administrator and at least two teachers in the same campus. Give Teacher A two subjects in one class and one subject in a second class. Give Teacher B a different class.

## Assignment isolation

1. Sign in as Teacher A.
2. Confirm the teacher overview lists only Teacher A assignments.
3. Confirm the two subjects in the same class produce one attendance option.
4. Confirm Teacher B's class is absent from Teacher A attendance and result pages.
5. Copy a Teacher B result-sheet URL and confirm Teacher A receives Not Found.

## Attendance

1. Open today's register from the teacher overview.
2. Confirm only active, currently enrolled learners appear.
3. Mark Present, Absent, Late and Excused examples.
4. Save the draft and reopen it.
5. Confirm all statuses and notes remain.
6. Submit the register.
7. Confirm teacher inputs become read-only.
8. Sign in as an administrator, correct one entry with a reason and lock the register.
9. Confirm Teacher A can view the locked register but cannot change it.

## Results

1. Open Teacher A results.
2. Create a missing sheet from an assigned subject.
3. Confirm the default grading scheme creates CA1, CA2 and Examination components.
4. Enter incomplete scores and confirm submission is rejected.
5. Complete every learner and component, add comments and save.
6. Confirm the progress indicator reaches 100%.
7. Submit the sheet.
8. Confirm Teacher A cannot approve, publish, lock or correct submitted scores.
9. Complete approval and publication with an administrator.

## Communications

1. Draft a class notice for an assigned current-term class.
2. Confirm the record is DRAFT and scoped to CLASS and the teacher's campus.
3. Submit it for review.
4. Confirm Teacher A cannot publish it.
5. Try an unassigned class identifier through a modified request and confirm rejection.
6. Open `/communications` as Teacher A and confirm redirection to `/teacher/communications`.
7. Confirm Teacher A cannot create a public story or delivery campaign.
8. Publish the notice as an administrator and confirm it appears in linked parent and student portals after its release time.

## Audit and responsive checks

1. Confirm teacher announcement creation and submission appear in audit history.
2. Confirm attendance and result mutations retain their existing audit entries.
3. Test all teacher pages at 360px Android width.
4. Test the same pages at desktop width.
5. Confirm primary buttons remain reachable without horizontal page scrolling.
