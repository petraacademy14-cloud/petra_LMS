# Phase 6B.1 acceptance checklist

## School-issued account workflow

- [ ] Owner can open `/people/portal-accounts`.
- [ ] Campus admin sees only guardians and students connected to the assigned campus.
- [ ] Creating a parent account returns a username and temporary password once.
- [ ] Creating a student account suggests the admission number as username.
- [ ] Copy message contains the correct parent or student login URL.
- [ ] Duplicate accounts for the same guardian or student are rejected.
- [ ] Duplicate usernames are rejected or receive a safe generated suffix.

## Authentication

- [ ] Parent credentials work at `/login/parent` only.
- [ ] Student credentials work at `/login/student` only.
- [ ] Temporary credentials require a new password.
- [ ] Five failed attempts produce a temporary lock.
- [ ] Resetting a password revokes existing sessions.
- [ ] Suspending an account revokes sessions and prevents login.
- [ ] Reactivating the account permits login again.

## Data isolation

- [ ] Parent sees every child linked to the selected guardian and no unrelated student.
- [ ] Parent fee balances are limited to linked children.
- [ ] Student sees exactly one linked student record.
- [ ] Student attendance and result counts include only published/controlled records.
- [ ] Changing a URL cannot switch a parent or student to another record.

## Teacher workspace

- [ ] Teacher staff login routes to `/teacher`.
- [ ] Owner and admin staff login routes to `/dashboard`.
- [ ] Teacher navigation shows only overview, attendance, results and communications.
- [ ] `/dashboard` redirects a teacher to `/teacher`.
- [ ] Teacher landing page lists only the membership's teaching assignments.

## Audit and database

- [ ] Account issue, reset, status change and portal password change create audit entries.
- [ ] No audit entry contains the readable temporary password.
- [ ] Portal account target and role cannot be changed after creation.
- [ ] Portal account school must match the linked guardian or student school.
- [ ] Parent/student sessions are separate from staff and applicant sessions.

## Responsive checks

- [ ] Account issuing page works at 360px and desktop width.
- [ ] Parent portal works at 360px and desktop width.
- [ ] Student portal works at 360px and desktop width.
- [ ] Teacher workspace works at 360px and desktop width.
