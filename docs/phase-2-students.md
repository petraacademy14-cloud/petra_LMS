# Phase 2: Student management

## Delivered scope

- Student and guardian profiles, including multiple guardians per student
- Explicit campus, class arm and academic-session placement
- Atomic admission number generation
- Complete enrolment history and bulk class promotion
- Search and filters for campus, class and lifecycle status
- Active, archived, withdrawn and graduated statuses without destructive delete
- CSV and XLSX imports with row-level and database-reference validation
- Optional private student document uploads
- Transactional audit events for creation, imports, promotion, status and files

## Import contract

Download the template from `/api/students/import-template`. Do not rename or
remove columns. Required reference values must already exist in the test
database:

- `campus_code`: `AWK` or `NNE`
- `class_code`: a Petra class-level code such as `PRI-2`
- `arm_code`: an arm available at that campus, such as `A`
- `academic_session`: exact session display name, such as `2026/2027`
- dates: `YYYY-MM-DD`
- gender: `MALE` or `FEMALE`
- guardian relationship: `FATHER`, `MOTHER`, `GUARDIAN`, `SIBLING`,
  `RELATIVE` or `OTHER`

`admission_number` may be blank. The application then generates a number in the
form `PET/AWK/2026/0001`. A supplied admission number is retained only when it
is unique within Petra Academy.

The import is all-or-nothing. Format errors, duplicate admission numbers,
unknown campuses/classes/sessions, or an unauthorized campus cause zero rows to
be written. Correct the reported rows and upload again.

## Test-environment import checklist

1. Confirm the Vercel Preview deployment uses a dedicated Supabase test project,
   never the production database.
2. Deploy migrations and seed Petra's campus, class and session references.
3. Export a current backup of the source spreadsheet and keep it outside Git.
4. Normalize it into the downloaded CSV/XLSX template.
5. Upload while signed in as the owner or appropriate campus admin.
6. Confirm the imported count equals the spreadsheet count.
7. Sample at least ten students across Awka and Nnewi: names, guardian phones,
   class, date of birth and admission number.
8. Search for sampled students and confirm campus admins cannot access the other
   campus.
9. Run one test promotion and verify both old and new enrolment rows.
10. Record the preview URL, import date, source row count and reviewer. Do not
    commit the spreadsheet or student personal data.

## Acceptance criteria

- Owners can read and manage both campuses; admins are limited to their campus.
- Teachers can read student profiles only within their campus.
- Every student has a unique Petra admission number and at least one guardian
  when created through the UI or importer.
- Promotions preserve earlier enrolment rows.
- Archived, withdrawn and graduated records remain searchable by status.
- `npm run check` passes and the preview migration succeeds.
- Petra's actual source file completes the test import and sampling checklist.
