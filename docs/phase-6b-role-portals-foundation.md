# Phase 6B.1 — Role portal foundation

## Product decision

Petra Academy creates parent and student accounts. Families and students do not self-register.

Authorized owners and campus admins open **People & roles → Parent and student accounts**, select an existing guardian or student record, and create the account. The system generates a username and temporary password. Staff copy the credentials once and send them to the family through Petra's approved communication channel.

The temporary password is hashed immediately and is never stored in readable form. The recipient must choose a new password at first login.

## Scope

### Parent accounts

- One portal account is linked to one existing guardian record.
- The account can see all Petra students linked to that guardian.
- Campus admins can issue or manage accounts only for guardians connected to a student in their campus.
- The parent foundation dashboard proves the link by showing only linked children, current placement and fee balances.

### Student accounts

- One portal account is linked to one existing student record.
- The suggested username is the student's admission number.
- Campus admins can issue or manage accounts only for students in their campus.
- The student foundation dashboard shows only that student's profile, placement, attendance summary, published-result count and fee balance.

### Teacher workspace

- Teachers continue using Better Auth staff email/password accounts.
- Successful teacher login routes to `/teacher`.
- Teacher navigation no longer exposes the general student register, people register, school structure or administration dashboards.
- The teacher landing page is built from the teacher's existing teaching assignments.

## Account administration

Staff can:

- create a parent or student account;
- copy the one-time credential message;
- suspend or reactivate an account;
- reset a password and copy the new temporary credentials;
- see last login, issue date, first-login status and temporary lock status.

Resetting or suspending an account revokes all active portal sessions.

## Authentication controls

- Parent and student authentication is separate from staff Better Auth accounts.
- Session cookies are HTTP-only, same-site and secure in production.
- Five failed attempts temporarily lock an account for 15 minutes.
- Account targets, school scope and account role cannot be changed after creation.
- Database checks enforce exactly one target: guardian for `PARENT`, student for `STUDENT`.
- Usernames are normalized to lowercase and unique.
- Important staff mutations and password changes are audited.

## Database migration

Migration: `20260731223000_phase_6b_role_portals`

Adds:

- `PortalAccountRole`
- `PortalAccountStatus`
- `portal_accounts`
- `portal_sessions`
- scope, target, username and login-attempt controls

Rollback requires first revoking portal sessions and confirming that no pilot family depends on the accounts. The tables can then be removed before the two enums. Normal production rollback should restore the prior deployment and database backup instead of manually dropping identity records.

## Acceptance checks

1. Create one parent account from an existing guardian.
2. Copy the credentials and sign in at `/login/parent`.
3. Confirm first login requires a new password.
4. Confirm the parent sees only linked children.
5. Create one student account and sign in at `/login/student`.
6. Confirm the student sees only their own record.
7. Reset the parent password and confirm the old session is revoked.
8. Suspend the student account and confirm login is rejected.
9. Sign in as a teacher and confirm routing to `/teacher`.
10. Confirm the teacher cannot open `/students`, `/people` or `/dashboard` through navigation and that `/dashboard` redirects to `/teacher`.
11. Check 360px Android and desktop layouts.
12. Confirm no temporary password appears in the database or audit history.

## Next slices

- Phase 6B.2: detailed parent fees, receipts, attendance, results, report cards and announcements.
- Phase 6B.3: detailed student attendance, results, report cards and announcements.
- Phase 6B.4: assignment-focused teacher attendance, result and communication refinements.
