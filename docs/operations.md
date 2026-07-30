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
   record from each completed module.
6. Record restore time, recovery point, failures and follow-up actions.
7. Destroy the temporary restored database after approval.

## Error response

Structured logs include environment, version, message and a fingerprint.
Database error records may include school, campus, user, route and request ID,
but must not include secrets. Critical production errors should be connected to
an external alerting provider before pilot launch.
