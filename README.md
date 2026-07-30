# Petra LMS

Petra Academy's school-operations platform for the Awka and Nnewi campuses.
The first release is a focused Nigerian school-management system—not a full
e-learning platform.

## Phase 1 foundation

- Multi-campus school structure
- Email/password authentication with database sessions
- Owner, admin and teacher roles with campus-scoped permissions
- Academic sessions, terms, class arms and subject offerings
- Append-only audit history, structured error logging and responsive shell

## Phase 2 student management

- Student and multiple-guardian profiles
- Campus, class and academic-session enrollment history
- Atomic `PET/{CAMPUS}/{YEAR}/{SEQUENCE}` admission numbers
- CSV and Excel import with staged row validation and explicit confirmation
- Search by student, admission number, guardian or phone plus campus/class/status filters
- Audited bulk class promotion
- Active, withdrawn, graduated and archived lifecycle states
- Optional private student documents in Supabase Storage

## Stack

- Next.js 16, React 19 and TypeScript
- PostgreSQL 17 and Prisma ORM 7
- Better Auth
- Tailwind CSS 4
- Vitest
- Vercel previews and GitHub Actions

## Local setup

1. Copy `.env.example` to `.env` and replace the development secrets.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Run `npm install`, `npm run db:deploy` and `npm run db:seed`.
4. Start the app with `npm run dev`.

The non-production seed creates the owner email in `SEED_OWNER_EMAIL` plus an
Awka admin and teacher. Never use the local fallback password outside a
disposable local database.

## Verification

```bash
npm run check
```

## Documentation

- [Architecture](docs/architecture.md)
- [Security and permissions](docs/security.md)
- [Environments, backups and restore](docs/operations.md)
- [Phase 1 acceptance criteria](docs/phase-1-foundation.md)
- [Phase 2 student management](docs/phase-2-student-management.md)

Read `AGENTS.md` before starting any task.

