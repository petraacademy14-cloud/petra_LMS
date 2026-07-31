# Phase 3: Fees and payments

## Scope

Phase 3 provides Petra Academy's manual fee recording and reconciliation
workflow. It deliberately does not connect Paystack, Flutterwave, bank webhooks
or other payment gateways.

## Financial model

- Fee categories are school-wide.
- Fee structures are scoped by campus, term, class level and category.
- Applying a structure creates each matching student's charge once.
- Student-specific charges and discounts are supported.
- Cash, bank transfer, POS and manually confirmed online payments are supported.
- Part payments are allowed; overpayments are rejected.
- Receipt numbers use `PET/{CAMPUS}/{YEAR}/{SEQUENCE}`.
- The signed fee ledger is append-only: charges are positive; discounts and
  payments are negative.
- A correction creates a reversal record and equal-and-opposite ledger entry.
  It never edits or deletes the original payment, charge or allocation.
- Daily reconciliation compares expected posted payments with the declared
  amount for one campus, date and method.
- Reminders are generated as drafts only. No external message is sent.

## Phase 2 student integration

`StudentFeeAccount` is a finance-owned projection, not a second student master.
Phase 2 must call `syncStudentFeeAccount` from
`src/lib/student-finance-sync.ts` after:

- student creation or import;
- a campus/class enrollment change or promotion;
- admission-number or name correction;
- withdrawal, graduation, archive or reactivation.

`studentId` is the stable Phase 2 student ID. The name, admission number and
class are snapshots used for cashier search and historical receipts. Transactions
continue to reference the fee account after the student changes class.

## Authorization

- Owners see and operate all campuses.
- Admins read, record and reconcile finance transactions only in their assigned
  campus.
- Teachers have no finance access in the MVP.
- Server actions recheck the permission and campus scope.
- Database triggers reject cross-school/campus finance records.

## Acceptance checks

- A fee structure cannot be duplicated for the same campus, term, class and
  category.
- Applying structures twice does not duplicate a student charge.
- A part payment reduces the balance and receives a unique receipt.
- Printable receipt and PDF download show the same payment and status.
- A reversed payment restores the balance and the original receipt is visibly
  marked reversed.
- Collection reports exclude reversed payments.
- Students owing and owner dashboard totals are derived from the signed ledger.
- A reconciliation with zero variance closes; a difference remains open.
- Reminder generation only includes positive balances and clearly creates
  drafts.
- `npm run check` passes before merge.

## Gateway readiness gate

Do not integrate a payment gateway until Petra staff have completed at least two
full terms of sampled manual reconciliation without unexplained variances, the
reversal workflow is understood, receipt sequencing is stable, and every daily
method total can be reproduced from the transaction report.
