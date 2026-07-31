# Phase 6A.2: Applicant admissions foundation

## Scope

This slice turns the public admissions UI into a working, auditable applicant workflow.

- Guardians create a dedicated applicant account separate from staff Better Auth accounts.
- Passwords use salted scrypt hashes; sessions use random tokens stored only as SHA-256 digests.
- Applicants can sign in, save a partial draft, choose campus/class and online or onsite exam preference.
- Applicants upload private supporting documents and submit the completed application.
- Submitted applications are locked and tracked by application number and controlled status.
- Public school-visit requests are stored and managed from the internal admissions workspace.
- Owners see all campuses; campus admins only see records for their assigned campus.
- Important registration, draft, submission, upload and status events are written to the audit log.

## Workflow

Application statuses are controlled:

`DRAFT → SUBMITTED → AWAITING_PAYMENT → AWAITING_EXAMINATION → UNDER_REVIEW → ACCEPTED`

Rejection is possible after submission, payment or examination. Under-review applications may also be waitlisted. Final decision documents and entrance fee/exam implementation are later Phase 6A slices.

Visit statuses are controlled:

`REQUESTED → CONFIRMED → COMPLETED`

A requested or confirmed visit can be cancelled.

## Storage

Create a private Supabase Storage bucket named `admission-documents` before testing uploads.

Accepted file types:

- PDF
- JPEG
- PNG

Maximum file size: 5 MB.

The application stores only private storage keys and metadata. No public document URL is generated.

## Database

The migration adds:

- `applicant_accounts`
- `applicant_sessions`
- `admission_applications`
- `application_documents`
- `visit_bookings`

The admissions models are declared in `prisma/admissions.prisma`. They are listed as external in Prisma Config so future migration generation does not attempt to recreate or remove the manually reviewed tables. Their structure must continue to be changed through committed SQL migrations and mirrored in the admissions Prisma file.

## Acceptance checks

- Duplicate applicant emails are prevented within the school.
- Invalid applicant credentials do not reveal whether an email exists.
- Applicant session cookies are HTTP-only, SameSite=Lax and secure in production.
- A submitted application cannot be edited or receive new documents.
- An application cannot be submitted without placement, student identity, date of birth, address, exam mode and declaration.
- A class must be active and offered by the selected campus.
- Campus admins cannot read or transition another campus’s applications or visit requests.
- Status changes cannot skip payment, examination and review stages.
- Visit dates cannot be in the past.
- Public actions never write passwords or document contents to audit logs.
- `npm run check` passes before merge.
