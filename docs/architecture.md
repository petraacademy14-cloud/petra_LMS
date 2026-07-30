# Architecture

## System shape

Petra LMS is one modular Next.js application backed by PostgreSQL. Server
Components read through a server-only data layer. Better Auth owns credentials
and database sessions. Prisma owns application data and migrations.

## Tenant and campus model

`School` is the tenant boundary. Petra Academy initially has two `Campus`
records: Awka and Nnewi.

- An owner membership has a school ID and no campus ID.
- An admin or teacher membership must have one campus ID.
- School-wide catalogues include academic sessions, class levels and subjects.
- Campus-owned structures include terms, class arms and subject offerings.
- Future students, invoices, payments, attendance and results must carry a
  campus ID.

The database migration adds checks and triggers that prevent role/scope
mismatches and cross-school campus references. The server DAL independently
checks the same boundary before data access.

## Modules

- `src/lib/auth.ts`: Better Auth server configuration
- `src/lib/dal.ts`: session, permission and campus-scope verification
- `src/lib/permissions.ts`: explicit role-permission matrix
- `src/app/actions`: validated transactional mutations
- `src/lib/audit.ts`: append-only audit event writer
- `src/lib/error-log.ts`: structured application error capture
- `prisma/schema.prisma`: canonical data model

## Student records

`Student` belongs to one school and campus. `Guardian` is school-scoped so one
guardian may be linked to siblings at either Petra campus. `StudentGuardian`
stores the relationship and contact permissions. `Enrollment` is append-only
history: promotion closes the current row and creates a row for the new session
and class. The database migration rejects cross-school or cross-campus links.

Admission numbers use `PET/{campus}/{year}/{sequence}`. A database-backed
`AdmissionSequence` increment runs inside the student transaction, so concurrent
creates cannot receive the same number.

## Decision rules

- Keep modules in one application until scale provides evidence for separation.
- Prefer Server Components and Server Actions; add client JavaScript only for
  interaction.
- Return narrow DTOs/selects instead of full database records.
- Recheck authorization close to every data source and mutation.
- Keep important mutations and their audit event in one transaction.
