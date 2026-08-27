# Class management and class teachers

## Operating model

Petra Academy manages teachers at class-teacher level for the current MVP.

- A class level is created once for a campus.
- Arm A and Arm B are created automatically.
- Students are placed into a specific arm during student creation or import.
- One active teacher is assigned as class teacher for each arm and academic session.
- The class teacher receives attendance and result access for every active subject offered at that campus.
- Replacing a class teacher removes the previous teacher's derived class access and transfers draft result sheets to the replacement. Submitted, approved, published and locked records preserve their historical teacher.
- Adding a term or enabling a subject automatically creates the required class-teacher access records.

## Owner and admin experience

The Academics screen is the management workspace.

1. Set the current academic session.
2. Add a class by selecting a campus and entering the class name. The system creates A and B.
3. Add active teacher accounts for the campus.
4. Assign one class teacher to each arm.
5. Add subjects directly to the campus in one step.
6. Create students and select the required A or B arm.

Owners can work across all campuses. Admins remain restricted to their assigned campus.

## Acceptance checks

- Create `Primary 1` at Awka and confirm `Primary 1 A` and `Primary 1 B` appear.
- Repeat the action and confirm duplicate arms are not created.
- Create a student and confirm either A or B can be selected as the current class.
- Assign an Awka teacher to `Primary 1 A` and confirm the assignment appears immediately.
- Confirm a Nnewi teacher cannot be assigned to an Awka class.
- Confirm a teacher cannot be assigned to both arms accidentally through one submission.
- Add a subject and confirm the class teacher receives the corresponding teaching assignments for every term in the current session.
- Add a new term and confirm existing class teachers receive access for all active campus subjects.
- Replace a class teacher and confirm the previous teacher loses derived class access.
- Confirm draft result sheets move to the replacement teacher while submitted or published sheets keep their historical teacher.
- Verify owner access across campuses and admin campus isolation.
- Verify the workflow at 360px mobile width and desktop width.
