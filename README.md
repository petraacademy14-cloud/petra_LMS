# Petra LMS

Petra Academy's school-operations platform for the Awka and Nnewi campuses.
The first release is a focused Nigerian school-management system—not a full
e-learning platform.

## Phase 1 foundation

- Multi-campus school structure
- Email/password authentication with database sessions
- Owner, admin and teacher roles
- Server-enforced role and campus permissions
- Academic sessions and campus terms
- Class levels, campus class arms and subject offerings
- Append-only audit history and structured error logging
- Responsive application shell
- PostgreSQL migrations, seed data, CI and environment runbooks

## Phase 2 student management

- Student profiles with campus, status and generated admission numbers
- Multiple guardians and primary/pickup contact flags
- Current class assignment and immutable enrolment history
- Search by name, admission number or guardian plus campus/class/status filters
- Atomic bulk promotion into a new academic session
- All-or-nothing CSV/XLSX import with row-level validation
- Optional private Supabase Storage documents

## Stack

- Next.js 16, React 19 and TypeScript
- PostgreSQL 17
- Prisma ORM 7
- Better Auth
- Tailwind CSS 4
- Vitest
- Vercel previews and GitHub Actions

## Local setup

1. Copy `.env.example` to `.env` and replace the development secrets.
2. Start PostgreSQL:

   ```bash
   docker compose up -d postgres
   ```

3. Install, migrate and seed:

   ```bash
   npm install
   npm run db:generate
   npm run db:deploy
   npm run db:seed
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

The non-production seed creates the owner email in `SEED_OWNER_EMAIL` plus an
Awka admin and teacher. They use `SEED_OWNER_PASSWORD`. Never use the local
fallback password outside a disposable local database.

## Verification

```bash
npm run check
```

This runs linting, TypeScript, unit tests and the production build.

## Documentation

- [Architecture](docs/architecture.md)
- [Security and permissions](docs/security.md)
- [Environments, backups and restore](docs/operations.md)
- [Phase 1 acceptance criteria](docs/phase-1-foundation.md)
- [Phase 2 student management and import](docs/phase-2-students.md)

Read `AGENTS.md` before starting any task.
