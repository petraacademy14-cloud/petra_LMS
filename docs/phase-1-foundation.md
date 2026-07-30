# Phase 1: Foundation acceptance criteria

## School and campus

- Petra Academy has one school record.
- Awka and Nnewi exist as independent campus records.
- Owners can view both; campus staff cannot access the other campus.
- Cross-school campus references are rejected.

## Authentication and access

- Public account registration is disabled by default.
- Valid issued accounts can sign in and sign out.
- Inactive or missing memberships do not enter the application.
- Owner, admin and teacher permissions match `docs/security.md`.
- Server mutations recheck permission and campus scope.

## Academic structure

- Owners can create academic sessions, class levels and subjects.
- Authorized owners/admins can create campus terms and class arms.
- Authorized owners/admins can enable subjects per campus.
- Only one current session exists per school.
- Only one current term exists per campus.

## Accountability and operations

- Foundation mutations and their audit event commit atomically.
- Audit rows cannot be updated or deleted by the application role.
- Unexpected errors have structured logging and fingerprints.
- Local, preview and production are documented as separate environments.
- Backup retention and quarterly restore drills are documented.

## Interface and quality

- The shell is usable at 360px width and desktop widths.
- Navigation is filtered by permission.
- Tables remain horizontally usable on small screens.
- Lint, type checks, tests and production build pass in CI.
