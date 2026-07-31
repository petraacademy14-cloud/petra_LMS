# Environments, backups and recovery

## Environment separation

| Environment | Purpose | Database |
| --- | --- | --- |
| Local | Developer work | Local disposable PostgreSQL |
| Preview | Pull-request acceptance testing | Dedicated preview/test database |
| Production | Approved school operations | Production-only database |

Preview must never connect to production. Vercel environment variables must be
configured separately for Preview and Production.

## Deployment sequence

1. CI runs lint, types, unit tests, migration deployment and production build.
2. Vercel creates a preview for the feature branch.
3. A human checks the task acceptance criteria at phone and desktop widths.
4. Before a high-risk migration, confirm a fresh production restore point.
5. Merge the approved pull request.
6. Vercel runs `npm run vercel-build`, applying pending migrations through
   `DIRECT_URL` before building the exact approved commit.
7. Perform the production smoke checks.

Vercel runtime traffic uses the pooled `DATABASE_URL`. Prisma CLI migration
commands prefer the direct/session `DIRECT_URL`, falling back to `DATABASE_URL`
for local and CI environments.

### Phase 2 migration

`20260730210000_phase_2_student_management` only adds new enums, tables,
indexes, foreign keys and scope triggers. Take a restore point before deploying.
Rollback is restore-based after records have been imported; dropping the Phase 2
tables would permanently destroy student data and is not an approved rollback.

### Student document storage

Document uploads are optional. In Supabase Storage, create a private bucket named
`student-documents`, then set `SUPABASE_URL` and the server-only
`SUPABASE_SECRET_KEY` in Preview and Production. Never expose that secret with a
`NEXT_PUBLIC_` prefix. Keep the bucket private; the application records only
metadata and opaque object keys in PostgreSQL.

### Phase 3 migration

The Phase 3 finance migration creates append-only triggers. Confirm a fresh
restore point before deploying it. Test the migration and the reversal workflow
against the preview database before production.

### Phase 4 migration

The Phase 4 migration adds teaching assignments, attendance, grading and result
tables plus scope and lock triggers. Test register submission/correction and the
full result approval-to-lock sequence in Preview before production. Rollback
after staff have entered records is restore-based.

### Phase 5 migration

The Phase 5 migration adds communication templates, announcements, delivery
drafts, public publications, media metadata and subscribers. Create a private
Supabase Storage bucket named `communication-media` before testing uploads.
The migration has scope checks and is restore-based after real communications
or subscribers have been recorded.

## Backup policy

Use the managed PostgreSQL provider's automated backups:

- Point-in-time recovery enabled where the provider supports it.
- Daily backup retained for at least 30 days.
- Monthly backup retained for at least 12 months.
- Encrypted at rest and in transit.
- Access limited to the school owner and designated technical administrator.

An untested backup is not a recovery plan. Run a restore drill into a new,
isolated database at least quarterly.

## Restore drill

1. Create a new isolated restore database.
2. Restore the selected production recovery point.
3. set `DATABASE_URL` only in an isolated test environment.
4. Run `npm run db:deploy` to apply any later compatible migrations.
5. Verify sign-in, campus counts, current session, audit history and a sampled
   record from each completed module. For Phase 3, verify one posted payment,
   receipt download, balance, reversal and reconciliation batch. For Phase 4,
   verify one attendance correction and one published/locked report card.
6. Record restore time, recovery point, failures and follow-up actions.
7. Destroy the temporary restored database after approval.

## Error response

Structured logs include environment, version, message and a fingerprint.
Database error records may include school, campus, user, route and request ID,
but must not include secrets. Critical production errors should be connected to
an external alerting provider before pilot launch.
