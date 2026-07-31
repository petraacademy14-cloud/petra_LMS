# Security and permissions

## Authentication

Better Auth provides email/password authentication and database-backed sessions.
Public registration is disabled unless `ALLOW_SELF_SIGN_UP=true`. Production
must provide a high-entropy `BETTER_AUTH_SECRET`, HTTPS and secure cookies.

## Roles

| Capability | Owner | Admin | Teacher |
| --- | --- | --- | --- |
| View school and campus | All campuses | Assigned campus | Assigned campus |
| Manage school/campuses | Yes | Assigned-campus operations only | No |
| Manage sessions and academics | Yes | Assigned campus | No |
| View staff | All campuses | Assigned campus | Assigned campus |
| Manage staff | Yes | Assigned campus; no owner escalation | No |
| View fees and payments | All campuses | Assigned campus | No |
| Record fees and payments | All campuses | Assigned campus | No |
| Reconcile payment methods | All campuses | Assigned campus | No |
| Take attendance | All campuses | Assigned campus | Assigned classes |
| Correct/lock attendance | All campuses | Assigned campus | No |
| Enter and submit results | All campuses | Assigned campus | Assigned subjects/classes |
| Approve/publish/lock results | All campuses | Assigned campus | No |
| Draft announcements and public updates | All campuses | Assigned campus | Assigned campus |
| Review/publish communications | All campuses | Assigned campus | No |
| View audit history | School-wide | Assigned campus | No |
| Manage system settings | Yes | No | No |

`src/lib/permissions.ts` is the executable permission matrix. Any change to the
table above must update that file and its tests in the same pull request.

## Enforcement

- Session checks happen in the server-only DAL.
- Owners can cross campus boundaries inside their school.
- Admins and teachers must match the target campus.
- Server Actions and Route Handlers are treated as public endpoints and recheck
  permission and scope.
- Database checks prevent admins/teachers without a campus and make audit logs
  immutable.
- Finance tables carry explicit school and campus scope. Database triggers reject
  cross-scope account, term, class and category references.
- Posted payments, charges, allocations, reversals and ledger entries cannot be
  updated or deleted at the database layer.
- Teaching assignments bind teachers to a campus, term, class and subject.
- Locked attendance registers and result sheets reject entry/score updates at
  the database layer. Corrections before locking require an audit reason.

- Communication publishing is state-controlled; public routes expose only PUBLISHED records.
- Delivery generation stores drafts and recipient counts but does not send externally.

## Secrets and personal data

- Never commit `.env` or exported production records.
- Use separate credentials per environment.
- Avoid logging passwords, session tokens, access tokens, student health data or
  full request bodies.
- Store only the minimum data required in audit and error contexts.
- Rotate secrets after any suspected disclosure.
