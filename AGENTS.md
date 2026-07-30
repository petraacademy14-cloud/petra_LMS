<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Petra LMS engineering rules

## Product boundary

- Version 1 is a Nigerian school-management system, not a full e-learning LMS.
- Prioritize school setup, students, fees, attendance, results and parent communication.
- Do not add video lessons, transport tracking, inventory, payroll, library management, advanced AI or complex accounting unless a later phase explicitly approves it.
- Optimize for Android phones, low-data conditions and simple workflows.

## Architecture

- Keep one modular TypeScript/Next.js/PostgreSQL codebase.
- Treat `School` as the tenant and `Campus` as a first-class operational/security scope.
- Every campus-owned record must carry `campusId`; never infer campus from the current UI.
- Owners are school-scoped. Admins and teachers are campus-scoped.
- Enforce authorization again at every Server Action, Route Handler and data-access operation.
- Use the server-only DAL in `src/lib/dal.ts`; UI visibility is not a security control.
- Financial records introduced in later phases must use an immutable ledger and reversals, never destructive edits.

## Data and audit

- Use Prisma migrations for every schema change. Never use `db push` against shared environments.
- Keep local, preview and production databases separate.
- Record important mutations in `audit_logs` inside the same transaction as the mutation.
- Audit records are append-only. Never add application code that updates or deletes them.
- Preserve school and campus scoping in queries and composite operations.

## Team workflow

- One task = one feature branch = one focused chat.
- Branch from current `main`; do not work directly on `main`.
- Use branch names such as `phase-1/auth-foundation` or `phase-2/student-import`.
- Pull requests must include scope, screenshots for UI changes, migration notes and verification results.
- GitHub files and checked-in specifications are the source of truth, not chat history.
- Do not overwrite unrelated work in a dirty worktree.

## Definition of done

- Acceptance criteria are met.
- `npm run check` passes.
- New authorization or business rules have tests.
- Schema changes include migrations and rollback/restore notes.
- Responsive behavior is checked at phone and desktop widths.
- No secrets, personal data or production credentials are committed.
