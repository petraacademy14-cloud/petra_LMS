# Phase 2: Student management

## Delivered workflows

- Owners can manage students across Awka and Nnewi.
- Admins can manage students only in their assigned campus.
- Teachers can search and read student profiles in their assigned campus.
- A student may have multiple guardians; one may be the primary contact.
- Every class movement creates enrollment history instead of overwriting it.
- Admission numbers use an atomic, campus/year counter.
- Withdrawn, graduated and archived records remain searchable and auditable.
- Bulk promotion closes current enrollments and creates new current enrollments
  in one transaction.
- Documents are optional, private, limited to PDF/JPG/PNG and 5 MB, and stored
  in the existing Supabase project.

## Import safety

Use `public/student-import-template.csv` as the canonical column template.
CSV and `.xlsx` files are limited to 1,000 rows and 5 MB per batch.

1. Select the campus, class and academic session.
2. Upload the file.
3. The server validates required columns, names, dates, gender, guardian
   relationship, phone/email formats and duplicate admission numbers.
4. If any row is invalid, the batch imports zero students. Correct the source
   file and upload it again.
5. If every row is valid, an owner or admin confirms the batch.
6. Students, guardians, enrollments, import links and audit events are committed
   in one transaction.

Never import real records into production first. Use the Vercel Preview
environment and its separate test database, verify counts and sample profiles,
then repeat the approved import in production.

## Supabase document bucket

Create a private bucket named `student-documents` in the existing Supabase
project. Set `SUPABASE_STUDENT_DOCUMENT_BUCKET` only if a different private
bucket name is used. The app performs authorization before upload and download;
the bucket must not be public.

## Migration and rollback

Migration `20260730200000_phase_2_student_management` adds only new enums,
tables, indexes and foreign keys. Before applying it to a shared environment,
confirm a fresh restore point. Rollback should restore that database snapshot;
do not drop student tables after real records have been imported.

## Test-environment acceptance

- `npm run check` passes.
- Vercel Preview deploys with its own Supabase/PostgreSQL database.
- An owner and an Awka admin can create and find a test student.
- The admin cannot access a student assigned to Nnewi.
- A CSV with one bad row imports zero records and displays the exact error.
- The corrected file imports the expected count once.
- Promotion preserves the previous enrollment and creates one current enrollment.
- Status changes and mutations appear in audit history.
- If document storage is enabled, a PDF uploads and downloads only for an
  authorized user.
- Petra’s actual student file is imported into Preview and the totals are
  reconciled with the source file.
